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

  if (pageQuery.data.data.contentUnreadable) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm">
        <p className="font-medium text-destructive">Page content cannot be edited</p>
        <p className="mt-1 text-muted-foreground">
          This page was saved with document version{" "}
          {pageQuery.data.data.unsupportedVersion ?? "unknown"}, which is newer
          than this app supports. Upgrade Portfolio Studio to edit it.
        </p>
      </div>
    );
  }

  return (
    <PageEditorShell page={pageQuery.data.data} permissions={permissions} />
  );
}
