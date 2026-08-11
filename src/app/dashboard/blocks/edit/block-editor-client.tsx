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

  return (
    <BlockEditorShell block={blockQuery.data.data} permissions={permissions} />
  );
}
