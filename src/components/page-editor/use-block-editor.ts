"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import { useEditorDocument } from "@/components/page-editor/use-editor-document";
import type { BlockNode } from "@/db/schema";
import { useUpdateBlockMutation } from "@/queries/blocks";
import type { BlockSummary } from "@/responses/blocks";

function toExpectedUpdatedAt(
  value: Date | string | null | undefined,
): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.toISOString();
}

/** Binds the shared editor document to a reusable block's `children`. */
export function useBlockEditor(block: BlockSummary) {
  const serverContent = useMemo(() => block.children ?? [], [block.children]);
  const updateMutation = useUpdateBlockMutation();

  async function onSave(children: BlockNode[]) {
    const result = await updateMutation.mutateAsync({
      id: block.id,
      payload: {
        children,
        expectedUpdatedAt: toExpectedUpdatedAt(block.updatedAt),
      },
    });
    if (!result.success) {
      if (result.statusCode === 409) return "conflict" as const;
      toast.error(result.message);
      return "error" as const;
    }
    toast.success("Block saved.");
    return "ok" as const;
  }

  return useEditorDocument({
    serverContent,
    saving: updateMutation.isPending,
    onSave,
  });
}
