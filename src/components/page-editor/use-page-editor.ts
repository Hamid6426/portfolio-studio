"use client";

import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { useEditorDocument } from "@/components/page-editor/use-editor-document";
import type { BlockNode } from "@/db/schema.types";
import { useUpdatePageMutation } from "@/queries/pages";
import type { PageSummary } from "@/responses/pages";
import { toIsoString } from "@/utils/time.utils";

/** Binds the shared editor document to a page's `content`. */
export function usePageEditor(
  page: PageSummary,
  options: { canEdit?: boolean } = {},
) {
  const serverContent = useMemo(() => page.content ?? [], [page.content]);
  const updateMutation = useUpdatePageMutation();
  // Track the latest known server `updatedAt` so autosave does not 409 against
  // our own previous save while the query refetch is still in flight (C8).
  const updatedAtRef = useRef(page.updatedAt);
  useEffect(() => {
    updatedAtRef.current = page.updatedAt;
  }, [page.updatedAt]);

  async function onSave(
    content: BlockNode[],
    saveOptions?: { quiet?: boolean },
  ) {
    const expectedUpdatedAt = toIsoString(updatedAtRef.current);
    if (!expectedUpdatedAt) {
      toast.error("Missing page version — reload and try again.");
      return "error" as const;
    }
    const result = await updateMutation.mutateAsync({
      id: page.id,
      payload: {
        content,
        expectedUpdatedAt,
        revisionKind: saveOptions?.quiet ? "autosave" : "manual",
      },
    });
    if (!result.success) {
      if (result.statusCode === 409) return "conflict" as const;
      toast.error(result.message);
      return "error" as const;
    }
    updatedAtRef.current = result.data.updatedAt;
    if (!saveOptions?.quiet) {
      toast.success("Page saved.");
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
