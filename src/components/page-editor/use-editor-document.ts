"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import type { BlockType } from "@/components/page-editor/block-registry";
import { createBlockNode } from "@/components/page-editor/block-registry";
import {
  findNode,
  insertChild,
  moveNode,
  removeNodeById,
  updateNodeById,
} from "@/components/page-editor/tree-ops";
import type { BlockNode } from "@/db/schema";

const HISTORY_LIMIT = 100;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function treeKey(nodes: BlockNode[]): string {
  return JSON.stringify(nodes);
}

type EditorDoc = {
  past: BlockNode[][];
  present: BlockNode[];
  future: BlockNode[][];
  /** Content we believe the server currently holds. `dirty` is measured here. */
  baseline: BlockNode[];
  /** Serialized form of the last server payload we reacted to. */
  serverKey: string;
  /** The server moved on while we had unsaved edits. */
  conflict: boolean;
};

type EditorAction =
  | { type: "apply"; transform: (nodes: BlockNode[]) => BlockNode[] }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "saved"; content: BlockNode[] }
  | { type: "sync"; content: BlockNode[]; key: string };

function editorReducer(state: EditorDoc, action: EditorAction): EditorDoc {
  switch (action.type) {
    case "apply": {
      const present = action.transform(state.present);
      // Tree ops return the same reference for impossible/no-op edits.
      if (present === state.present) return state;
      return {
        ...state,
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present,
        future: [],
      };
    }

    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
      };
    }

    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: state.future.slice(1),
      };
    }

    case "saved":
      return { ...state, baseline: action.content, conflict: false };

    case "sync": {
      // Only react to genuinely new server payloads, otherwise the refetch that
      // follows our own save would be replayed as an external change.
      if (action.key === state.serverKey) return state;

      const baselineKey = treeKey(state.baseline);
      if (action.key === baselineKey) {
        // Our own save echoing back.
        return { ...state, serverKey: action.key, conflict: false };
      }

      if (treeKey(state.present) !== baselineKey) {
        // Unsaved local edits: never discard them, just flag the divergence.
        return { ...state, serverKey: action.key, conflict: true };
      }

      return {
        past: [],
        present: action.content,
        future: [],
        baseline: action.content,
        serverKey: action.key,
        conflict: false,
      };
    }

    default:
      return state;
  }
}

function initEditorDoc(content: BlockNode[]): EditorDoc {
  return {
    past: [],
    present: content,
    future: [],
    baseline: content,
    serverKey: treeKey(content),
    conflict: false,
  };
}

export type EditorDocumentSource = {
  /** The tree as the server currently holds it (a page's content, a block's children). */
  serverContent: BlockNode[];
  /** True while the owning save request is in flight. */
  saving: boolean;
  /**
   * Persist a snapshot of the tree. Return `false` when the save failed so the
   * document stays dirty; reporting the failure to the user is the caller's job.
   */
  onSave: (content: BlockNode[]) => Promise<boolean>;
};

/**
 * Editing surface for a `BlockNode[]` document: history, selection, keyboard
 * shortcuts, dirty tracking and external-change detection.
 *
 * What the document *is* — where its tree comes from and where a save goes — is
 * supplied by the caller, so pages and reusable blocks share one implementation.
 */
export function useEditorDocument({
  serverContent,
  saving,
  onSave,
}: EditorDocumentSource) {
  const [doc, dispatch] = useReducer(
    editorReducer,
    serverContent,
    initEditorDoc,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const content = doc.present;
  const dirty = useMemo(
    () => treeKey(content) !== treeKey(doc.baseline),
    [content, doc.baseline],
  );

  const apply = useCallback(
    (transform: (nodes: BlockNode[]) => BlockNode[]) => {
      dispatch({ type: "apply", transform });
    },
    [],
  );

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  // Pull in server updates (our own save, or another tab) without clobbering
  // edits that are still in progress here.
  const serverKey = useMemo(() => treeKey(serverContent), [serverContent]);
  useEffect(() => {
    dispatch({ type: "sync", content: serverContent, key: serverKey });
  }, [serverContent, serverKey]);

  function addBlock(type: BlockType, parentId: string | null = null) {
    const node = createBlockNode(type);
    apply((nodes) => {
      const target =
        parentId ??
        (selectedId && findNode(nodes, selectedId)?.children !== undefined
          ? selectedId
          : null);
      return insertChild(nodes, target, node);
    });
    setSelectedId(node.id);
  }

  function insertLibraryBlock(libraryChildren: BlockNode[]) {
    const cloned = structuredClone(libraryChildren).map(remapIds);
    if (cloned.length === 0) return;
    apply((nodes) =>
      cloned.reduce((acc, node) => insertChild(acc, null, node), nodes),
    );
    if (cloned[0]) setSelectedId(cloned[0].id);
  }

  const deleteBlock = useCallback(
    (id: string) => {
      apply((nodes) => (findNode(nodes, id) ? removeNodeById(nodes, id) : nodes));
      setSelectedId((current) => (current === id ? null : current));
    },
    [apply],
  );

  function deleteSelected() {
    if (!selectedId) return;
    deleteBlock(selectedId);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      // Windows-style redo.
      if (mod && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === "Delete" && selectedId) {
        event.preventDefault();
        deleteBlock(selectedId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, deleteBlock, undo, redo]);

  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Legacy browsers still require a truthy returnValue.
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function updateSelected(patch: Partial<Pick<BlockNode, "props" | "styles">>) {
    if (!selectedId) return;
    apply((nodes) =>
      updateNodeById(nodes, selectedId, (node) => ({
        ...node,
        props: patch.props ? { ...node.props, ...patch.props } : node.props,
        styles: patch.styles
          ? { ...(node.styles ?? {}), ...patch.styles }
          : node.styles,
      })),
    );
  }

  function setSelectedStyles(styles: Record<string, string>) {
    if (!selectedId) return;
    apply((nodes) =>
      updateNodeById(nodes, selectedId, (node) => ({ ...node, styles })),
    );
  }

  function setSelectedProps(props: Record<string, unknown>) {
    if (!selectedId) return;
    apply((nodes) =>
      updateNodeById(nodes, selectedId, (node) => ({ ...node, props })),
    );
  }

  function reorder(nodeId: string, parentId: string | null, index: number) {
    apply((nodes) => moveNode(nodes, nodeId, parentId, index));
  }

  async function save() {
    // Snapshot now so edits made while the request is in flight stay dirty.
    const snapshot = content;
    const saved = await onSave(snapshot);
    if (!saved) return false;
    dispatch({ type: "saved", content: snapshot });
    return true;
  }

  const selected = selectedId ? findNode(content, selectedId) : null;

  return {
    content,
    selectedId,
    selected,
    dirty,
    conflict: doc.conflict,
    canUndo: doc.past.length > 0,
    canRedo: doc.future.length > 0,
    pending: saving,
    setSelectedId,
    addBlock,
    insertLibraryBlock,
    deleteSelected,
    updateSelected,
    setSelectedStyles,
    setSelectedProps,
    reorder,
    undo,
    redo,
    save,
  };
}

/** What `EditorShell` needs from whichever document it is driving. */
export type EditorDocument = ReturnType<typeof useEditorDocument>;

function remapIds(node: BlockNode): BlockNode {
  return {
    ...node,
    id: crypto.randomUUID(),
    children: node.children?.map(remapIds),
  };
}
