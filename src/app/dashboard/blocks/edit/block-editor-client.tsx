"use client";

import { Loader2Icon } from "lucide-react";

import { BlockEditorShell } from "@/components/page-editor/block-editor-shell";
import type { Permission } from "@/config/permissions";
import { useBlockQuery } from "@/queries/blocks";

type BlockEditorClientProps = {
  blockId: string;
  permissions: Permission[] | string;
};

export function BlockEditorClient({
  blockId,
  permissions,
}: BlockEditorClientProps) {
  const blockQuery = useBlockQuery(blockId);

  if (blockQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading editor…
      </div>
    );
  }

  if (!blockQuery.data?.success) {
    return (
      <p className="text-sm text-destructive">
        {blockQuery.data?.message ?? "Failed to load block."}
      </p>
    );
  }

  if (blockQuery.data.data.contentUnreadable) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm">
        <p className="font-medium text-destructive">Block content cannot be edited</p>
        <p className="mt-1 text-muted-foreground">
          This block was saved with document version{" "}
          {blockQuery.data.data.unsupportedVersion ?? "unknown"}, which is newer
          than this app supports. Upgrade Portfolio Studio to edit it.
        </p>
      </div>
    );
  }

  return (
    <BlockEditorShell block={blockQuery.data.data} permissions={permissions} />
  );
}
