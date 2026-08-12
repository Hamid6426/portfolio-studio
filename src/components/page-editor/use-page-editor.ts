"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import { useEditorDocument } from "@/components/page-editor/use-editor-document";
import type { BlockNode } from "@/db/schema";
import { useUpdatePageMutation } from "@/queries/pages";
import type { PageSummary } from "@/responses/pages";

function toExpectedUpdatedAt(
  value: Date | string | null | undefined,
): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.toISOString();
}

/** Binds the shared editor document to a page's `content`. */
export function usePageEditor(page: PageSummary) {
  const serverContent = useMemo(() => page.content ?? [], [page.content]);
  const updateMutation = useUpdatePageMutation();

  async function onSave(content: BlockNode[]) {
    const result = await updateMutation.mutateAsync({
      id: page.id,
      payload: {
        content,
        expectedUpdatedAt: toExpectedUpdatedAt(page.updatedAt),
      },
    });
    if (!result.success) {
      if (result.statusCode === 409) return "conflict" as const;
      toast.error(result.message);
      return "error" as const;
    }
    toast.success("Page saved.");
    return "ok" as const;
  }

  return useEditorDocument({
    serverContent,
    saving: updateMutation.isPending,
    onSave,
  });
}
