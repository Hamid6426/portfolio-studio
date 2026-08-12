"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import type { BlockType } from "@/components/page-editor/block-registry";
import { createBlockNode } from "@/components/page-editor/block-registry";
import {
  getEditorClipboard,
  hasEditorClipboard,
  readSystemClipboard,
  setEditorClipboard,
  writeSystemClipboard,
} from "@/components/page-editor/editor-clipboard";
import {
  editorReducer,
  initEditorDoc,
  treeKey,
} from "@/components/page-editor/editor-document-state";
import {
  findNode,
  findParent,
  indentNode,
  insertChild,
  moveNode,
  moveSibling,
  outdentNode,
  rangeSelectIds,
  removeNodesByIds,
  selectionRootIds,
  updateNodeById,
  cloneNodeWithNewIds,
  duplicateNodeAfter,
} from "@/components/page-editor/tree-ops";
import type { BlockNode } from "@/db/schema.types";
import type { TextSpan } from "@/lib/blocks/rich-text";
import type { ResponsiveStyles } from "@/lib/blocks/styles";

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

export type EditorSaveOptions = {
  /** Skip success toasts (used by debounced autosave). */
  quiet?: boolean;
};

export type SelectNodeOptions = {
  /** Ctrl/Cmd+click — add or remove from the selection. */
  toggle?: boolean;
  /** Shift+click — select the flatten-tree range from the anchor. */
  range?: boolean;
};

export type EditorDocumentSource = {
  /** The tree as the server currently holds it (a page's content, a block's children). */
  serverContent: BlockNode[];
  /** True while the owning save request is in flight. */
  saving: boolean;
  /** When false, skip Ctrl/Cmd+S (read-only roles). */
  canEdit?: boolean;
  /**
   * Persist a snapshot of the tree. Return `ok` on success; `conflict` when the
   * server rejected an optimistic-concurrency check; `error` for other failures.
   */
  onSave: (
    content: BlockNode[],
    options?: EditorSaveOptions,
  ) => Promise<"ok" | "conflict" | "error">;
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
  canEdit = true,
}: EditorDocumentSource) {
  const [doc, dispatch] = useReducer(
    editorReducer,
    serverContent,
    initEditorDoc,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(
    null,
  );
  /** Bumps when the shared editor clipboard changes so Paste buttons re-enable. */
  const [clipboardEpoch, setClipboardEpoch] = useState(0);

  /** Primary selection — last id in the multi-select list (settings / styles). */
  const selectedId =
    selectedIds.length > 0 ? selectedIds[selectedIds.length - 1]! : null;

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
      if (!canEdit) return;
      dispatch({ type: "apply", transform, mergeKey });
    },
    [canEdit],
  );

  const undo = useCallback(() => {
    if (!canEdit) return;
    dispatch({ type: "undo" });
  }, [canEdit]);
  const redo = useCallback(() => {
    if (!canEdit) return;
    dispatch({ type: "redo" });
  }, [canEdit]);

  const replaceSelection = useCallback((ids: string[], anchor?: string | null) => {
    const unique = [...new Set(ids.filter(Boolean))];
    setSelectedIds(unique);
    setSelectionAnchorId(
      anchor === undefined ? (unique[unique.length - 1] ?? null) : anchor,
    );
  }, []);

  const selectNode = useCallback(
    (id: string | null, options: SelectNodeOptions = {}) => {
      if (id === null) {
        replaceSelection([]);
        return;
      }

      if (options.range && selectionAnchorId) {
        replaceSelection(
          rangeSelectIds(content, selectionAnchorId, id),
          selectionAnchorId,
        );
        return;
      }

      if (options.toggle) {
        setSelectedIds((prev) => {
          if (prev.includes(id)) {
            const next = prev.filter((entry) => entry !== id);
            setSelectionAnchorId((anchor) => {
              if (next.length === 0) return null;
              if (anchor && next.includes(anchor)) return anchor;
              return next[next.length - 1] ?? null;
            });
            return next;
          }
          setSelectionAnchorId((anchor) => anchor ?? id);
          return [...prev, id];
        });
        return;
      }

      replaceSelection([id], id);
    },
    [content, replaceSelection, selectionAnchorId],
  );

  /** Single-id setter kept for call sites that replace the whole selection. */
  const setSelectedId = useCallback(
    (id: string | null) => {
      selectNode(id);
    },
    [selectNode],
  );

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
    replaceSelection([node.id], node.id);
  }

  function insertLibraryBlock(libraryChildren: BlockNode[]) {
    const cloned = structuredClone(libraryChildren).map(cloneNodeWithNewIds);
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
    if (cloned[0]) replaceSelection([cloned[0].id], cloned[0].id);
  }

  const deleteSelected = useCallback(() => {
    if (!canEdit || selectedIds.length === 0) return;
    const roots = selectionRootIds(content, selectedIds);
    if (roots.length === 0) return;
    const idSet = new Set(roots);
    apply((nodes) => removeNodesByIds(nodes, idSet));
    replaceSelection([]);
  }, [apply, canEdit, content, replaceSelection, selectedIds]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0 || !canEdit) return;
    const roots = selectionRootIds(content, selectedIds);
    if (roots.length === 0) return;

    // Compute outside the reducer so Strict Mode double-invoke stays pure (C4).
    let next = content;
    const duplicatedIds: string[] = [];
    for (const id of [...roots].reverse()) {
      const result = duplicateNodeAfter(next, id);
      if (!result) continue;
      next = result.nodes;
      duplicatedIds.unshift(result.duplicatedId);
    }
    if (duplicatedIds.length === 0) return;
    const tree = next;
    apply(() => tree);
    replaceSelection(duplicatedIds);
  }, [apply, canEdit, content, replaceSelection, selectedIds]);

  const copySelected = useCallback(() => {
    if (selectedIds.length === 0) return false;
    const roots = selectionRootIds(content, selectedIds);
    const nodes = roots
      .map((id) => findNode(content, id))
      .filter((node): node is BlockNode => Boolean(node));
    if (nodes.length === 0) return false;
    setEditorClipboard(nodes);
    setClipboardEpoch((value) => value + 1);
    void writeSystemClipboard(nodes);
    return true;
  }, [content, selectedIds]);

  const cutSelected = useCallback(() => {
    if (selectedIds.length === 0 || !canEdit) return;
    if (!copySelected()) return;
    deleteSelected();
  }, [canEdit, copySelected, deleteSelected, selectedIds.length]);

  const pasteClipboard = useCallback(async () => {
    if (!canEdit) return;

    let nodes = getEditorClipboard();
    if (nodes.length === 0) {
      const fromSystem = await readSystemClipboard();
      if (fromSystem?.length) {
        nodes = fromSystem;
        setEditorClipboard(fromSystem);
        setClipboardEpoch((value) => value + 1);
      }
    }
    if (nodes.length === 0) return;

    const cloned = nodes.map(cloneNodeWithNewIds);
    apply((tree) => {
      const located = selectedId ? findParent(tree, selectedId) : null;
      const parentId = located?.parent?.id ?? null;
      let index = located !== null ? located.index + 1 : tree.length;
      let next = tree;
      for (const node of cloned) {
        next = insertChild(next, parentId, node, index);
        index += 1;
      }
      return next;
    });
    if (cloned.length > 0) {
      replaceSelection(
        cloned.map((node) => node.id),
        cloned[0]!.id,
      );
    }
  }, [apply, canEdit, replaceSelection, selectedId]);

  const save = useCallback(
    async (
      options?: EditorSaveOptions,
    ): Promise<"ok" | "conflict" | "error"> => {
      // Snapshot now so edits made while the request is in flight stay dirty.
      const snapshot = content;
      const result = await onSave(snapshot, options);
      if (result === "ok") {
        dispatch({ type: "saved", content: snapshot });
      }
      return result;
    },
    [content, onSave],
  );

  const loadContent = useCallback(
    (nodes: BlockNode[]) => {
      dispatch({ type: "load", content: nodes });
      replaceSelection([]);
    },
    [replaceSelection],
  );

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
        if (!canEdit || !dirty || event.repeat) return;
        void save();
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedIds.length > 0 &&
        canEdit
      ) {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (mod && key === "d" && selectedIds.length > 0 && canEdit) {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (mod && key === "c" && selectedIds.length > 0) {
        event.preventDefault();
        copySelected();
        return;
      }

      if (mod && key === "x" && selectedIds.length > 0 && canEdit) {
        event.preventDefault();
        cutSelected();
        return;
      }

      if (mod && key === "v" && canEdit) {
        event.preventDefault();
        void pasteClipboard();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedIds.length,
    deleteSelected,
    duplicateSelected,
    copySelected,
    cutSelected,
    pasteClipboard,
    undo,
    redo,
    save,
    canEdit,
    dirty,
  ]);

  useEffect(() => {
    if (!canEdit || !dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Legacy browsers still require a truthy returnValue.
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [canEdit, dirty]);

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
          styles:
            patch.styles !== undefined ? patch.styles : node.styles,
        })),
      mergeKey,
    );
  }

  function setSelectedStyles(styles: ResponsiveStyles) {
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

  function updateNodeText(
    nodeId: string,
    next: { text: string; spans: TextSpan[] },
  ) {
    apply(
      (nodes) =>
        updateNodeById(nodes, nodeId, (node) => {
          const props: Record<string, unknown> = {
            ...node.props,
            text: next.text,
          };
          const hasMarks = next.spans.some((span) => Boolean(span.marks));
          if (hasMarks) {
            props.spans = next.spans;
          } else {
            delete props.spans;
          }
          return { ...node, props };
        }),
      `${nodeId}:props`,
    );
    if (selectedId !== nodeId) {
      replaceSelection([nodeId], nodeId);
    }
  }

  function reorder(nodeId: string, parentId: string | null, index: number) {
    apply((nodes) => moveNode(nodes, nodeId, parentId, index));
  }

  function moveSelectedUp() {
    if (selectedIds.length !== 1 || !selectedId) return;
    apply((nodes) => moveSibling(nodes, selectedId, -1));
  }

  function moveSelectedDown() {
    if (selectedIds.length !== 1 || !selectedId) return;
    apply((nodes) => moveSibling(nodes, selectedId, 1));
  }

  function outdentSelected() {
    if (selectedIds.length !== 1 || !selectedId) return;
    apply((nodes) => outdentNode(nodes, selectedId));
  }

  function indentSelected() {
    if (selectedIds.length !== 1 || !selectedId) return;
    apply((nodes) => indentNode(nodes, selectedId));
  }

  const selected = selectedId ? findNode(content, selectedId) : null;
  const canPaste = clipboardEpoch >= 0 && hasEditorClipboard();

  return {
    content,
    selectedId,
    selectedIds,
    selected,
    dirty,
    conflict: doc.conflict,
    canUndo: doc.past.length > 0,
    canRedo: doc.future.length > 0,
    canPaste,
    pending: saving,
    setSelectedId,
    selectNode,
    addBlock,
    insertLibraryBlock,
    deleteSelected,
    duplicateSelected,
    copySelected,
    cutSelected,
    pasteClipboard,
    updateSelected,
    setSelectedStyles,
    setSelectedProps,
    updateNodeText,
    reorder,
    moveSelectedUp,
    moveSelectedDown,
    outdentSelected,
    indentSelected,
    undo,
    redo,
    save,
    loadContent,
  };
}

/** What `EditorShell` needs from whichever document it is driving. */
export type EditorDocument = ReturnType<typeof useEditorDocument>;
