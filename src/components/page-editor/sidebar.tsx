"use client";

import {
  LayersIcon,
  Settings2Icon,
  ShapesIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import type { BlockType } from "@/components/page-editor/block-registry";
import { ElementsPalette } from "@/components/page-editor/elements-palette";
import { LayersPanel } from "@/components/page-editor/layers-panel";
import { SettingsPanel } from "@/components/page-editor/settings-panel";
import { StylePanel } from "@/components/page-editor/style-panel";
import type { BlockNode } from "@/db/schema.types";
import type { ResponsiveStyles } from "@/lib/blocks/styles";
import type { BlockListItem } from "@/responses/blocks";

type EditorSidebarProps = {
  content: BlockNode[];
  selected: BlockNode | null;
  selectedId: string | null;
  selectedIds: readonly string[];
  canEdit?: boolean;
  onSelect: (
    id: string,
    options?: { toggle?: boolean; range?: boolean },
  ) => void;
  onAdd: (type: BlockType) => void;
  layoutBlocks: BlockListItem[];
  onInsertLayout: (block: BlockListItem) => void;
  onStylesChange: (styles: ResponsiveStyles) => void;
  onPropsChange: (props: Record<string, unknown>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOutdent: () => void;
  onIndent: () => void;
};

export function EditorSidebar({
  content,
  selected,
  selectedId,
  selectedIds,
  canEdit = true,
  onSelect,
  onAdd,
  layoutBlocks,
  onInsertLayout,
  onStylesChange,
  onPropsChange,
  onDelete,
  onDuplicate,
  onCopy,
  onCut,
  onPaste,
  canPaste,
  onMoveUp,
  onMoveDown,
  onOutdent,
  onIndent,
}: EditorSidebarProps) {
  const multi = selectedIds.length > 1;
  const noop = () => undefined;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <ShapesIcon className="size-3.5 shrink-0 opacity-70" />
            Elements
          </div>
          {canEdit ? (
            <ElementsPalette
              onAdd={onAdd}
              layoutBlocks={layoutBlocks}
              onInsertLayout={onInsertLayout}
            />
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Read-only — you can select and inspect blocks.
            </p>
          )}
        </section>

        <section className="border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <LayersIcon className="size-3.5 shrink-0 opacity-70" />
            Layers
          </div>
          <LayersPanel
            content={content}
            selectedId={selectedId}
            selectedIds={selectedIds}
            canPaste={canEdit && canPaste}
            onSelect={onSelect}
            onMoveUp={canEdit ? onMoveUp : noop}
            onMoveDown={canEdit ? onMoveDown : noop}
            onOutdent={canEdit ? onOutdent : noop}
            onIndent={canEdit ? onIndent : noop}
            onDuplicate={canEdit ? onDuplicate : noop}
            onCopy={onCopy}
            onCut={canEdit ? onCut : noop}
            onPaste={canEdit ? onPaste : noop}
          />
        </section>

        <section className="border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <SlidersHorizontalIcon className="size-3.5 shrink-0 opacity-70" />
            Style
          </div>
          {multi ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Select a single block to edit styles.
            </p>
          ) : canEdit ? (
            <StylePanel
              content={content}
              selected={selected}
              onChange={onStylesChange}
            />
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Styles are read-only for your role.
            </p>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Settings2Icon className="size-3.5 shrink-0 opacity-70" />
            Settings
          </div>
          <SettingsPanel
            selected={multi ? null : selected}
            selectionCount={selectedIds.length}
            onChange={canEdit ? onPropsChange : noop}
            onStylesChange={canEdit ? onStylesChange : noop}
            onDelete={canEdit ? onDelete : noop}
            onDuplicate={canEdit ? onDuplicate : noop}
            onCopy={onCopy}
            onCut={canEdit ? onCut : noop}
            onPaste={canEdit ? onPaste : noop}
            canPaste={canEdit && canPaste}
          />
        </section>
      </div>
    </aside>
  );
}
