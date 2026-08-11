"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { useUpdatePageMutation } from "@/queries/pages";
import type { PageSummary } from "@/responses/pages";

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

export function usePageEditor(page: PageSummary) {
  const [content, setContent] = useState<BlockNode[]>(page.content ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState<BlockNode[][]>([page.content ?? []]);
  const updateMutation = useUpdatePageMutation();

  function commit(next: BlockNode[]) {
    setContent(next);
    setDirty(true);
    setHistory((prev) => [...prev.slice(-29), next]);
  }

  function undo() {
    if (history.length < 2) return;
    const prev = history[history.length - 2]!;
    setHistory((h) => h.slice(0, -1));
    setContent(prev);
    setDirty(true);
  }

  function addBlock(type: BlockType, parentId: string | null = null) {
    const node = createBlockNode(type);
    const targetParent =
      parentId ??
      (selectedId && findNode(content, selectedId)?.children !== undefined
        ? selectedId
        : null);
    commit(insertChild(content, targetParent, node));
    setSelectedId(node.id);
  }

  function insertLibraryBlock(libraryChildren: BlockNode[]) {
    const cloned = structuredClone(libraryChildren).map(remapIds);
    let next = content;
    for (const node of cloned) {
      next = insertChild(next, null, node);
    }
    commit(next);
    if (cloned[0]) setSelectedId(cloned[0].id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    commit(removeNodeById(content, selectedId));
    setSelectedId(null);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      if (isTypingTarget(event.target)) return;
      if (!selectedId) return;

      event.preventDefault();
      commit(removeNodeById(content, selectedId));
      setSelectedId(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, content]);

  function updateSelected(
    patch: Partial<Pick<BlockNode, "props" | "styles">>,
  ) {
    if (!selectedId) return;
    commit(
      updateNodeById(content, selectedId, (node) => ({
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
    commit(
      updateNodeById(content, selectedId, (node) => ({
        ...node,
        styles,
      })),
    );
  }

  function setSelectedProps(props: Record<string, unknown>) {
    if (!selectedId) return;
    commit(
      updateNodeById(content, selectedId, (node) => ({
        ...node,
        props,
      })),
    );
  }

  function reorder(nodeId: string, parentId: string | null, index: number) {
    commit(moveNode(content, nodeId, parentId, index));
  }

  async function save() {
    const result = await updateMutation.mutateAsync({
      id: page.id,
      payload: { content },
    });
    if (!result.success) {
      toast.error(result.message);
      return false;
    }
    toast.success("Page saved.");
    setDirty(false);
    return true;
  }

  const selected = selectedId ? findNode(content, selectedId) : null;

  return {
    content,
    selectedId,
    selected,
    dirty,
    pending: updateMutation.isPending,
    setSelectedId,
    addBlock,
    insertLibraryBlock,
    deleteSelected,
    updateSelected,
    setSelectedStyles,
    setSelectedProps,
    reorder,
    undo,
    save,
  };
}

function remapIds(node: BlockNode): BlockNode {
  return {
    ...node,
    id: crypto.randomUUID(),
    children: node.children?.map(remapIds),
  };
}
