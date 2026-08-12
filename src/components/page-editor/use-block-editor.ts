"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import { useEditorDocument } from "@/components/page-editor/use-editor-document";
import type { BlockNode } from "@/db/schema.types";
import { useUpdateBlockMutation } from "@/queries/blocks";
import type { BlockSummary } from "@/responses/blocks";
import { toIsoString } from "@/utils/time.utils";

/** Binds the shared editor document to a reusable block's `children`. */
export function useBlockEditor(
  block: BlockSummary,
  options: { canEdit?: boolean } = {},
) {
  const serverContent = useMemo(() => block.children ?? [], [block.children]);
  const updateMutation = useUpdateBlockMutation();

  async function onSave(
    children: BlockNode[],
    saveOptions?: { quiet?: boolean },
  ) {
    const expectedUpdatedAt = toIsoString(block.updatedAt);
    if (!expectedUpdatedAt) {
      toast.error("Missing block version — reload and try again.");
      return "error" as const;
    }
    const result = await updateMutation.mutateAsync({
      id: block.id,
      payload: {
        children,
        expectedUpdatedAt,
        revisionKind: saveOptions?.quiet ? "autosave" : "manual",
      },
    });
    if (!result.success) {
      if (result.statusCode === 409) return "conflict" as const;
      toast.error(result.message);
      return "error" as const;
    }
    if (!saveOptions?.quiet) {
      toast.success("Block saved.");
    }
    return "ok" as const;
  }

  return useEditorDocument({
    serverContent,
    saving: updateMutation.isPending,
    onSave,
    canEdit: options.canEdit ?? true,
  });
}
