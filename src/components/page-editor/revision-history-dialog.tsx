"use client";

import { useState } from "react";
import { HistoryIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BlockNode } from "@/db/schema.types";
import {
  useRestoreRevisionMutation,
  useRevisionsQuery,
} from "@/queries/revisions";
import type { RevisionEntityType } from "@/repositories/revisions";
import { getRevisionRequest } from "@/services/revisions";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/time.utils";

type RevisionHistoryDialogProps = {
  entityType: RevisionEntityType;
  entityId: string;
  expectedUpdatedAt: string;
  canEdit: boolean;
  dirty: boolean;
  onRestored: (content: BlockNode[]) => void;
};

function sourceLabel(source: string): string {
  if (source === "autosave") return "Autosave";
  if (source === "restore") return "Restore";
  return "Save";
}

export function RevisionHistoryDialog({
  entityType,
  entityId,
  expectedUpdatedAt,
  canEdit,
  dirty,
  onRestored,
}: RevisionHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const revisionsQuery = useRevisionsQuery(entityType, entityId, open);
  const restoreMutation = useRestoreRevisionMutation(entityType);

  const revisions =
    revisionsQuery.data?.success === true ? revisionsQuery.data.data : [];

  async function restore(revisionId: string) {
    if (!canEdit) return;
    if (dirty) {
      toast.error("Save or discard unsaved changes before restoring.");
      return;
    }

    const detail = await getRevisionRequest(entityType, entityId, revisionId);
    if (!detail.success) {
      toast.error(detail.message);
      return;
    }
    if (detail.data.contentUnreadable) {
      toast.error("That revision cannot be read on this app version.");
      return;
    }

    const result = await restoreMutation.mutateAsync({
      entityId,
      revisionId,
      payload: { expectedUpdatedAt },
    });
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    onRestored(detail.data.content);
    toast.success("Revision restored.");
    setConfirmId(null);
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <HistoryIcon data-icon="inline-start" />
        History
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirmId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>
              Snapshots of this draft. Autosaves are kept at most every five
              minutes when content changes; identical trees are skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto rounded-md border border-border">
            {revisionsQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Loading…
              </div>
            ) : revisions.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No revisions yet. Save the document to start history.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {revisions.map((revision) => {
                  const confirming = confirmId === revision.id;
                  return (
                    <li
                      key={revision.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5",
                        confirming && "bg-muted/40",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {formatDateTime(revision.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sourceLabel(revision.source)}
                        </p>
                      </div>
                      {canEdit ? (
                        confirming ? (
                          <div className="flex shrink-0 gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={restoreMutation.isPending}
                              onClick={() => setConfirmId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={restoreMutation.isPending || dirty}
                              onClick={() => void restore(revision.id)}
                            >
                              {restoreMutation.isPending ? (
                                <Loader2Icon
                                  data-icon="inline-start"
                                  className="animate-spin"
                                />
                              ) : null}
                              Restore
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => setConfirmId(revision.id)}
                          >
                            Restore
                          </Button>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {dirty ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Unsaved editor changes block restore — save or discard first.
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
