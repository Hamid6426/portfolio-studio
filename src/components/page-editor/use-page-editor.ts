"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import { useEditorDocument } from "@/components/page-editor/use-editor-document";
import type { BlockNode } from "@/db/schema";
import { useUpdatePageMutation } from "@/queries/pages";
import type { PageSummary } from "@/responses/pages";

/** Binds the shared editor document to a page's `content`. */
export function usePageEditor(page: PageSummary) {
  const serverContent = useMemo(() => page.content ?? [], [page.content]);
  const updateMutation = useUpdatePageMutation();

  async function onSave(content: BlockNode[]) {
    const result = await updateMutation.mutateAsync({
      id: page.id,
      payload: { content },
    });
    if (!result.success) {
      toast.error(result.message);
      return false;
    }
    toast.success("Page saved.");
    return true;
  }

  return useEditorDocument({
    serverContent,
    saving: updateMutation.isPending,
    onSave,
  });
}
