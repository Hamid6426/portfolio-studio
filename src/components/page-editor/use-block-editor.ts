"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import { useEditorDocument } from "@/components/page-editor/use-editor-document";
import type { BlockNode } from "@/db/schema";
import { useUpdateBlockMutation } from "@/queries/blocks";
import type { BlockSummary } from "@/responses/blocks";

/** Binds the shared editor document to a reusable block's `children`. */
export function useBlockEditor(block: BlockSummary) {
  const serverContent = useMemo(() => block.children ?? [], [block.children]);
  const updateMutation = useUpdateBlockMutation();

  async function onSave(children: BlockNode[]) {
    // The update payload is a full replacement, so the metadata owned by the
    // blocks table has to ride along unchanged.
    const result = await updateMutation.mutateAsync({
      id: block.id,
      payload: {
        name: block.name,
        description: block.description,
        canBeLayout: block.canBeLayout,
        children,
      },
    });
    if (!result.success) {
      toast.error(result.message);
      return false;
    }
    toast.success("Block saved.");
    return true;
  }

  return useEditorDocument({
    serverContent,
    saving: updateMutation.isPending,
    onSave,
  });
}
