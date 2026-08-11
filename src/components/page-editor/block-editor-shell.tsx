"use client";

import { EditorShell } from "@/components/page-editor/editor-shell";
import { useBlockEditor } from "@/components/page-editor/use-block-editor";
import {
  canShowButton,
  PERMISSIONS,
  type Permission,
} from "@/config/permissions";
import type { BlockSummary } from "@/responses/blocks";

const BLOCKS_PATH = "/dashboard/blocks";

type BlockEditorShellProps = {
  block: BlockSummary;
  permissions: Permission[] | string;
};

export function BlockEditorShell({
  block,
  permissions,
}: BlockEditorShellProps) {
  const editor = useBlockEditor(block);

  return (
    <EditorShell
      editor={editor}
      documentLabel="block"
      title={block.name}
      subtitle={block.canBeLayout ? "Layout block" : "Block"}
      backHref={BLOCKS_PATH}
      backLabel="Back to blocks"
      // A block has no public URL of its own — it renders inside the pages it
      // is attached to — so there is nothing to preview.
      // The API enforces `blocksEdit`; without this the Save button just 403s.
      canEdit={canShowButton(permissions, PERMISSIONS.blocksEdit)}
      excludeLayoutBlockId={block.id}
    />
  );
}
