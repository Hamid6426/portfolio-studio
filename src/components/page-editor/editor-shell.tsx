"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  EyeIcon,
  Loader2Icon,
  Redo2Icon,
  SaveIcon,
  TriangleAlertIcon,
  Undo2Icon,
} from "lucide-react";

import { EditorCanvas } from "@/components/page-editor/canvas";
import { EditorSidebar } from "@/components/page-editor/sidebar";
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
import { pagePreviewPath, pagePublicPath } from "@/lib/pages/preview-path";
import { useLayoutBlocksQuery } from "@/queries/blocks";
import type { PageSummary } from "@/responses/pages";

const PAGES_PATH = "/dashboard/pages";

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
      title: "Preview the saved version?",
      description: `Preview opens the last saved version of this ${label}. Unsaved edits will not appear until you save.`,
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
}: EditorShellProps) {
  const router = useRouter();
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
              {editor.dirty ? " · Unsaved changes" : ""}
              {!canEdit ? " · Read-only" : ""}
            </p>
          </div>
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
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              disabled={!editor.dirty || editor.pending}
              onClick={() => void editor.save()}
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
          onSelect={editor.setSelectedId}
          onReorder={editor.reorder}
        />
        <EditorSidebar
          content={editor.content}
          selected={editor.selected}
          selectedId={editor.selectedId}
          onSelect={editor.setSelectedId}
          onAdd={editor.addBlock}
          layoutBlocks={layoutBlocks}
          onInsertLayout={(block) =>
            editor.insertLibraryBlock(block.children ?? [])
          }
          onStylesChange={editor.setSelectedStyles}
          onPropsChange={editor.setSelectedProps}
          onDelete={editor.deleteSelected}
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
    </div>
  );
}

type PageEditorShellProps = {
  page: PageSummary;
  permissions: Permission[] | string;
};

export function PageEditorShell({ page, permissions }: PageEditorShellProps) {
  const editor = usePageEditor(page);

  // A draft is not served at its public URL, so Preview has to ask for the
  // draft explicitly — otherwise previewing an unpublished page 404s.
  const previewHref = page.publishedAt
    ? pagePublicPath(page.slug)
    : pagePreviewPath(page.slug);

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
      canEdit={canShowButton(permissions, PERMISSIONS.pagesEdit)}
    />
  );
}
