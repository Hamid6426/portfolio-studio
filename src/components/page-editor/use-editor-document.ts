"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import type { BlockType } from "@/components/page-editor/block-registry";
import { createBlockNode } from "@/components/page-editor/block-registry";
import {
  findNode,
  findParent,
  indentNode,
  insertChild,
  moveNode,
  moveSibling,
  outdentNode,
  removeNodeById,
  updateNodeById,
} from "@/components/page-editor/tree-ops";
import type { BlockNode } from "@/db/schema";

const HISTORY_LIMIT = 100;

const MERGE_WINDOW_MS = 500;

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

function isDialogTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[role="dialog"]'));
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
  lastMergeKey: string | null;
  lastMergeAt: number;
};

type EditorAction =
  | {
      type: "apply";
      transform: (nodes: BlockNode[]) => BlockNode[];
      mergeKey?: string;
    }
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

      const now = Date.now();
      const merge =
        action.mergeKey !== undefined &&
        action.mergeKey === state.lastMergeKey &&
        now - state.lastMergeAt < MERGE_WINDOW_MS;

      if (merge) {
        return {
          ...state,
          present,
          lastMergeAt: now,
        };
      }

      return {
        ...state,
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present,
        future: [],
        lastMergeKey: action.mergeKey ?? null,
        lastMergeAt: action.mergeKey !== undefined ? now : 0,
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
        lastMergeKey: null,
        lastMergeAt: 0,
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
    lastMergeKey: null,
    lastMergeAt: 0,
  };
}

export type EditorDocumentSource = {
  /** The tree as the server currently holds it (a page's content, a block's children). */
  serverContent: BlockNode[];
  /** True while the owning save request is in flight. */
  saving: boolean;
  /**
   * Persist a snapshot of the tree. Return `ok` on success; `conflict` when the
   * server rejected an optimistic-concurrency check; `error` for other failures.
   */
  onSave: (content: BlockNode[]) => Promise<"ok" | "conflict" | "error">;
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
    (
      transform: (nodes: BlockNode[]) => BlockNode[],
      mergeKey?: string,
    ) => {
      dispatch({ type: "apply", transform, mergeKey });
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
      if (parentId !== null) {
        return insertChild(nodes, parentId, node);
      }
      if (!selectedId) {
        return insertChild(nodes, null, node);
      }
      const selected = findNode(nodes, selectedId);
      if (selected?.children !== undefined) {
        return insertChild(nodes, selectedId, node);
      }
      const located = findParent(nodes, selectedId);
      if (!located) {
        return insertChild(nodes, null, node);
      }
      return insertChild(
        nodes,
        located.parent?.id ?? null,
        node,
        located.index + 1,
      );
    });
    setSelectedId(node.id);
  }

  function insertLibraryBlock(libraryChildren: BlockNode[]) {
    const cloned = structuredClone(libraryChildren).map(remapIds);
    if (cloned.length === 0) return;
    apply((nodes) => {
      const located = selectedId ? findParent(nodes, selectedId) : null;
      const parentId = located?.parent?.id ?? null;
      let index = located !== null ? located.index + 1 : nodes.length;
      let next = nodes;
      for (const node of cloned) {
        next = insertChild(next, parentId, node, index);
        index += 1;
      }
      return next;
    });
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

  const save = useCallback(async (): Promise<"ok" | "conflict" | "error"> => {
    // Snapshot now so edits made while the request is in flight stay dirty.
    const snapshot = content;
    const result = await onSave(snapshot);
    if (result === "ok") {
      dispatch({ type: "saved", content: snapshot });
    }
    return result;
  }, [content, onSave]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (isDialogTarget(event.target)) return;

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

      if (mod && key === "s") {
        event.preventDefault();
        void save();
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedId
      ) {
        event.preventDefault();
        deleteBlock(selectedId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, deleteBlock, undo, redo, save]);

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
    const mergeKey =
      patch.props !== undefined
        ? `${selectedId}:props`
        : patch.styles !== undefined
          ? `${selectedId}:styles`
          : undefined;
    apply(
      (nodes) =>
        updateNodeById(nodes, selectedId, (node) => ({
          ...node,
          props: patch.props ? { ...node.props, ...patch.props } : node.props,
          styles: patch.styles
            ? { ...(node.styles ?? {}), ...patch.styles }
            : node.styles,
        })),
      mergeKey,
    );
  }

  function setSelectedStyles(styles: Record<string, string>) {
    if (!selectedId) return;
    apply(
      (nodes) =>
        updateNodeById(nodes, selectedId, (node) => ({ ...node, styles })),
      `${selectedId}:styles`,
    );
  }

  function setSelectedProps(props: Record<string, unknown>) {
    if (!selectedId) return;
    apply(
      (nodes) =>
        updateNodeById(nodes, selectedId, (node) => ({ ...node, props })),
      `${selectedId}:props`,
    );
  }

  function reorder(nodeId: string, parentId: string | null, index: number) {
    apply((nodes) => moveNode(nodes, nodeId, parentId, index));
  }

  function moveSelectedUp() {
    if (!selectedId) return;
    apply((nodes) => moveSibling(nodes, selectedId, -1));
  }

  function moveSelectedDown() {
    if (!selectedId) return;
    apply((nodes) => moveSibling(nodes, selectedId, 1));
  }

  function outdentSelected() {
    if (!selectedId) return;
    apply((nodes) => outdentNode(nodes, selectedId));
  }

  function indentSelected() {
    if (!selectedId) return;
    apply((nodes) => indentNode(nodes, selectedId));
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
    moveSelectedUp,
    moveSelectedDown,
    outdentSelected,
    indentSelected,
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
