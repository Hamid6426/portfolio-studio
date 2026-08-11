"use client";

import { Loader2Icon } from "lucide-react";

import { PageEditorShell } from "@/components/page-editor/editor-shell";
import type { Permission } from "@/config/permissions";
import { usePageQuery } from "@/queries/pages";

type PageEditorClientProps = {
  pageId: string;
  permissions: Permission[] | string;
};

export function PageEditorClient({
  pageId,
  permissions,
}: PageEditorClientProps) {
  const pageQuery = usePageQuery(pageId);

  if (pageQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading editor…
      </div>
    );
  }

  if (!pageQuery.data?.success) {
    return (
      <p className="text-sm text-destructive">
        {pageQuery.data?.message ?? "Failed to load page."}
      </p>
    );
  }

  return (
    <PageEditorShell page={pageQuery.data.data} permissions={permissions} />
  );
}
