"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  EyeIcon,
  Loader2Icon,
  Redo2Icon,
  SaveIcon,
  TriangleAlertIcon,
  Undo2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { EditorCanvas } from "@/components/page-editor/canvas";
import { useDirtyNav } from "@/components/page-editor/dirty-nav-context";
import { RevisionHistoryDialog } from "@/components/page-editor/revision-history-dialog";
import { EditorSidebar } from "@/components/page-editor/sidebar";
import { toIsoString } from "@/utils/time.utils";
import type { EditorDocument } from "@/components/page-editor/use-editor-document";
import { usePageEditor } from "@/components/page-editor/use-page-editor";
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
import type { BlockNode } from "@/db/schema.types";
import { pagePreviewPath, pagePublicPath } from "@/lib/pages/preview-path";
import type { RevisionEntityType } from "@/repositories/revisions";
import { getBlockRequest } from "@/services/blocks";
import { useLayoutBlocksQuery } from "@/queries/blocks";
import type { BlockListItem } from "@/responses/blocks";
import type { PageSummary } from "@/responses/pages";

const PAGES_PATH = "/dashboard/pages";

/** Idle debounce before a quiet autosave while the document is dirty. */
const AUTOSAVE_DELAY_MS = 2000;

function hasLevel1Heading(nodes: BlockNode[]): boolean {
  for (const node of nodes) {
    if (node.type === "heading" && Number(node.props.level ?? 2) === 1) {
      return true;
    }
    if (node.children?.length && hasLevel1Heading(node.children)) {
      return true;
    }
  }
  return false;
}

/** Which navigation the unsaved-changes dialog is guarding. */
type LeaveIntent = "back" | "preview";

type LeaveCopy = { title: string; description: string; confirm: string };

/** The copy only varies by what the document is called. */
function leaveCopyFor(label: string): Record<LeaveIntent, LeaveCopy> {
  return {
    back: {
      title: "Discard unsaved changes?",
      description: `This ${label} has edits that have not been saved. Leaving the editor discards them.`,
      confirm: "Discard and leave",
    },
    preview: {
      title: "Preview the draft?",
      description: `Preview opens the current draft of this ${label} (including unsaved editor state only after you save). Published pages still show the draft so you can check edits before publishing.`,
      confirm: "Open preview",
    },
  };
}

type EditorShellProps = {
  /** The document being edited, from `usePageEditor` / `useBlockEditor`. */
  editor: EditorDocument;
  /** Noun used in the unsaved-changes copy, e.g. `page` or `block`. */
  documentLabel: string;
  title: string;
  /** Line under the title; the dirty / read-only flags are appended to it. */
  subtitle: string;
  backHref: string;
  backLabel: string;
  /** Public URL of the saved document. Documents without one get no Preview. */
  previewHref?: string;
  /** Whether this user may save; the API gates the write regardless. */
  canEdit: boolean;
  /** Layout block to keep out of the palette (a block cannot insert itself). */
  excludeLayoutBlockId?: string;
  /** Optional actions rendered before Save (e.g. Publish block). */
  extraActions?: ReactNode;
  /** Enables the History dialog for this draft. */
  history?: {
    entityType: RevisionEntityType;
    entityId: string;
    expectedUpdatedAt: Date | string | null;
  };
};

export function EditorShell({
  editor,
  documentLabel,
  title,
  subtitle,
  backHref,
  backLabel,
  previewHref,
  canEdit,
  excludeLayoutBlockId,
  extraActions,
  history,
}: EditorShellProps) {
  const router = useRouter();
  const { setDirty } = useDirtyNav();
  const layoutBlocksQuery = useLayoutBlocksQuery();
  const layoutBlocks = useMemo(() => {
    const blocks = layoutBlocksQuery.data?.success
      ? layoutBlocksQuery.data.data
      : [];
    return excludeLayoutBlockId
      ? blocks.filter((block) => block.id !== excludeLayoutBlockId)
      : blocks;
  }, [layoutBlocksQuery.data, excludeLayoutBlockId]);

  // `intent` outlives `open` so the dialog keeps its copy while it animates out.
  const [leave, setLeave] = useState<{ open: boolean; intent: LeaveIntent }>({
    open: false,
    intent: "back",
  });
  const [saveConflictOpen, setSaveConflictOpen] = useState(false);
  const [reloadConfirmOpen, setReloadConfirmOpen] = useState(false);

  const missingH1 =
    documentLabel === "page" && !hasLevel1Heading(editor.content);

  useEffect(() => {
    setDirty(editor.dirty);
    return () => setDirty(false);
  }, [editor.dirty, setDirty]);

  // Debounced autosave — quiet (no success toast). Pauses while a save is in
  // flight, when the server moved on under us, or when the role is read-only.
  useEffect(() => {
    if (!canEdit || !editor.dirty || editor.pending || editor.conflict) {
      return;
    }

    const timer = window.setTimeout(() => {
      void editor.save({ quiet: true }).then((result) => {
        if (result === "conflict") {
          setSaveConflictOpen(true);
        }
      });
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    canEdit,
    editor.conflict,
    editor.content,
    editor.dirty,
    editor.pending,
    editor.save,
  ]);

  function openPreview() {
    if (!previewHref) return;
    window.open(previewHref, "_blank");
  }

  function askToLeave(intent: LeaveIntent) {
    setLeave({ open: true, intent });
  }

  function closeLeave() {
    setLeave((current) => ({ ...current, open: false }));
  }

  function guard(intent: LeaveIntent, proceed: () => void) {
    if (editor.dirty) {
      askToLeave(intent);
      return;
    }
    proceed();
  }

  function confirmLeave() {
    closeLeave();
    if (leave.intent === "back") router.push(backHref);
    if (leave.intent === "preview") openPreview();
  }

  async function handleSave() {
    const result = await editor.save();
    if (result === "conflict") {
      setSaveConflictOpen(true);
    }
  }

  async function handleInsertLayout(block: BlockListItem) {
    const response = await getBlockRequest(block.id);
    if (!response.success) {
      toast.error(response.message);
      return;
    }
    if (response.data.contentUnreadable) {
      toast.error(
        "That layout block uses a document version this app cannot read.",
      );
      return;
    }
    editor.insertLibraryBlock(response.data.children ?? []);
  }

  const leaveCopy = leaveCopyFor(documentLabel)[leave.intent];

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            render={<Link href={backHref} />}
            variant="ghost"
            size="icon-sm"
            aria-label={backLabel}
            onClick={(event) => {
              if (!editor.dirty) return;
              // Keep the href for middle-click / open-in-new-tab, but route the
              // in-tab navigation through the unsaved-changes dialog.
              event.preventDefault();
              askToLeave("back");
            }}
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {subtitle}
              {editor.pending
                ? " · Saving…"
                : editor.dirty
                  ? " · Unsaved changes"
                  : ""}
              {!canEdit ? " · Read-only" : ""}
            </p>
          </div>
          {missingH1 ? (
            <span
              className="flex shrink-0 items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-500"
              title="Pages should include one level-1 heading for accessibility and SEO."
            >
              <TriangleAlertIcon className="size-3" />
              No level-1 heading
            </span>
          ) : null}
          {editor.conflict ? (
            <span
              className="flex shrink-0 items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-500"
              title={`This ${documentLabel} was changed elsewhere. Saving overwrites that version.`}
            >
              <TriangleAlertIcon className="size-3" />
              Changed elsewhere
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            disabled={!editor.canUndo}
            onClick={() => editor.undo()}
          >
            <Undo2Icon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            disabled={!editor.canRedo}
            onClick={() => editor.redo()}
          >
            <Redo2Icon />
          </Button>
          {previewHref ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => guard("preview", openPreview)}
            >
              <EyeIcon data-icon="inline-start" />
              Preview
            </Button>
          ) : null}
          {extraActions}
          {history && toIsoString(history.expectedUpdatedAt) ? (
            <RevisionHistoryDialog
              entityType={history.entityType}
              entityId={history.entityId}
              expectedUpdatedAt={toIsoString(history.expectedUpdatedAt)!}
              canEdit={canEdit}
              dirty={editor.dirty}
              onRestored={(content) => editor.loadContent(content)}
            />
          ) : null}
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              disabled={!editor.dirty || editor.pending}
              onClick={() => void handleSave()}
            >
              {editor.pending ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              Save
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <EditorCanvas
          content={editor.content}
          selectedId={editor.selectedId}
          selectedIds={editor.selectedIds}
          onSelect={editor.selectNode}
          onReorder={editor.reorder}
          onTextChange={editor.updateNodeText}
        />
        <EditorSidebar
          content={editor.content}
          selected={editor.selected}
          selectedId={editor.selectedId}
          selectedIds={editor.selectedIds}
          onSelect={editor.selectNode}
          onAdd={editor.addBlock}
          layoutBlocks={layoutBlocks}
          onInsertLayout={(block) => void handleInsertLayout(block)}
          onStylesChange={editor.setSelectedStyles}
          onPropsChange={editor.setSelectedProps}
          onDelete={editor.deleteSelected}
          onDuplicate={editor.duplicateSelected}
          onCopy={() => {
            editor.copySelected();
          }}
          onCut={editor.cutSelected}
          onPaste={() => {
            void editor.pasteClipboard();
          }}
          canPaste={editor.canPaste}
          onMoveUp={editor.moveSelectedUp}
          onMoveDown={editor.moveSelectedDown}
          onOutdent={editor.outdentSelected}
          onIndent={editor.indentSelected}
        />
      </div>

      <Dialog
        open={leave.open}
        onOpenChange={(open) => !open && closeLeave()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{leaveCopy.title}</DialogTitle>
            <DialogDescription>{leaveCopy.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeLeave}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={leave.intent === "back" ? "destructive" : "default"}
              onClick={confirmLeave}
            >
              {leaveCopy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveConflictOpen} onOpenChange={setSaveConflictOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Could not save</DialogTitle>
            <DialogDescription>
              This {documentLabel} was changed elsewhere while you were editing.
              Reload the editor to pick up the latest version before saving again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveConflictOpen(false)}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              onClick={() => setReloadConfirmOpen(true)}
            >
              Reload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reloadConfirmOpen} onOpenChange={setReloadConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reload and discard local edits?</DialogTitle>
            <DialogDescription>
              Reloading picks up the latest version from the server. Any unsaved
              edits to this {documentLabel} will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReloadConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type PageEditorShellProps = {
  page: PageSummary;
  permissions: Permission[] | string;
};

export function PageEditorShell({ page, permissions }: PageEditorShellProps) {
  const canEdit = canShowButton(permissions, PERMISSIONS.pagesEdit);
  const editor = usePageEditor(page, { canEdit });

  // Always preview the draft — published public URLs serve the snapshot, which
  // hides exactly the edits Preview is meant to check.
  const previewHref = pagePreviewPath(page.slug);

  return (
    <EditorShell
      editor={editor}
      documentLabel="page"
      title={page.title}
      subtitle={pagePublicPath(page.slug)}
      backHref={PAGES_PATH}
      backLabel="Back to pages"
      previewHref={previewHref}
      // The API enforces `pagesEdit`; without this the Save button just 403s.
      canEdit={canEdit}
      history={{
        entityType: "page",
        entityId: page.id,
        expectedUpdatedAt: page.updatedAt,
      }}
    />
  );
}
