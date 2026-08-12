"use client";

import { useState } from "react";
import { CloudUploadIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { EditorShell } from "@/components/page-editor/editor-shell";
import { useBlockEditor } from "@/components/page-editor/use-block-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canShowButton,
  PERMISSIONS,
  type Permission,
} from "@/config/permissions";
import { usePublishBlockMutation } from "@/queries/blocks";
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
  const canEdit = canShowButton(permissions, PERMISSIONS.blocksEdit);
  const editor = useBlockEditor(block, { canEdit });
  const publishMutation = usePublishBlockMutation();
  const [publishOpen, setPublishOpen] = useState(false);

  const isPublished = Boolean(block.publishedAt);

  async function handlePublish() {
    const result = await publishMutation.mutateAsync(block.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? "Block published.");
    setPublishOpen(false);
  }

  const publishAction =
    canEdit && block.canBeLayout ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={editor.pending || publishMutation.isPending}
        onClick={() => setPublishOpen(true)}
      >
        <CloudUploadIcon data-icon="inline-start" />
        {isPublished ? "Publish changes" : "Publish block"}
      </Button>
    ) : null;

  return (
    <>
      <EditorShell
        editor={editor}
        documentLabel="block"
        title={block.name}
        subtitle={
          block.canBeLayout
            ? isPublished
              ? "Layout block · published"
              : "Layout block · draft only"
            : "Block"
        }
        backHref={BLOCKS_PATH}
        backLabel="Back to blocks"
        canEdit={canEdit}
        excludeLayoutBlockId={block.id}
        extraActions={publishAction}
      />

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish layout block</DialogTitle>
            <DialogDescription>
              Publish &ldquo;{block.name}&rdquo;? Every page that uses this block
              as its layout will show the current saved draft on the live site.
              Save your edits first — publishing copies the last saved version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPublishOpen(false)}
              disabled={publishMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handlePublish()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending && (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
