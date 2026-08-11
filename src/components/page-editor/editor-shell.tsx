"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowLeftIcon,
  EyeIcon,
  Loader2Icon,
  SaveIcon,
  Undo2Icon,
} from "lucide-react";

import { EditorCanvas } from "@/components/page-editor/canvas";
import { EditorSidebar } from "@/components/page-editor/sidebar";
import { usePageEditor } from "@/components/page-editor/use-page-editor";
import { Button } from "@/components/ui/button";
import { useLayoutBlocksQuery } from "@/queries/blocks";
import type { PageSummary } from "@/responses/pages";

function publicHref(page: PageSummary): string {
  return page.slug ? `/${page.slug}` : "/";
}

export function PageEditorShell({ page }: { page: PageSummary }) {
  const editor = usePageEditor(page);
  const layoutBlocksQuery = useLayoutBlocksQuery();
  const layoutBlocks = useMemo(
    () =>
      layoutBlocksQuery.data?.success ? layoutBlocksQuery.data.data : [],
    [layoutBlocksQuery.data],
  );

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            render={<Link href="/dashboard/pages" />}
            variant="ghost"
            size="icon-sm"
            aria-label="Back to pages"
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{page.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {publicHref(page)}
              {editor.dirty ? " · Unsaved changes" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.undo()}
          >
            <Undo2Icon data-icon="inline-start" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(publicHref(page), "_blank")}
          >
            <EyeIcon data-icon="inline-start" />
            Preview
          </Button>
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
    </div>
  );
}
