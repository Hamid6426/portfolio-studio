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
import type { BlockNode } from "@/db/schema";
import type { BlockListItem } from "@/responses/blocks";

type EditorSidebarProps = {
  content: BlockNode[];
  selected: BlockNode | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: BlockType) => void;
  layoutBlocks: BlockListItem[];
  onInsertLayout: (block: BlockListItem) => void;
  onStylesChange: (styles: Record<string, string>) => void;
  onPropsChange: (props: Record<string, unknown>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOutdent: () => void;
  onIndent: () => void;
};

export function EditorSidebar({
  content,
  selected,
  selectedId,
  onSelect,
  onAdd,
  layoutBlocks,
  onInsertLayout,
  onStylesChange,
  onPropsChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onOutdent,
  onIndent,
}: EditorSidebarProps) {
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <ShapesIcon className="size-3.5 shrink-0 opacity-70" />
            Elements
          </div>
          <ElementsPalette
            onAdd={onAdd}
            layoutBlocks={layoutBlocks}
            onInsertLayout={onInsertLayout}
          />
        </section>

        <section className="border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <LayersIcon className="size-3.5 shrink-0 opacity-70" />
            Layers
          </div>
          <LayersPanel
            content={content}
            selectedId={selectedId}
            onSelect={onSelect}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onOutdent={onOutdent}
            onIndent={onIndent}
          />
        </section>

        <section className="border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <SlidersHorizontalIcon className="size-3.5 shrink-0 opacity-70" />
            Style
          </div>
          <StylePanel selected={selected} onChange={onStylesChange} />
        </section>

        <section>
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Settings2Icon className="size-3.5 shrink-0 opacity-70" />
            Settings
          </div>
          <SettingsPanel
            selected={selected}
            onChange={onPropsChange}
            onDelete={onDelete}
          />
        </section>
      </div>
    </aside>
  );
}
