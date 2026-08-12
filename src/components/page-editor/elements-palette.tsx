"use client";

import type { LucideIcon } from "lucide-react";
import {
  BoxIcon,
  Code2Icon,
  Grid2x2Icon,
  HeadingIcon,
  ImageIcon,
  LayoutTemplateIcon,
  ListIcon,
  ListTodoIcon,
  MinusIcon,
  RectangleHorizontalIcon,
  SquareIcon,
  SpaceIcon,
  TypeIcon,
} from "lucide-react";

import {
  BLOCK_DEFINITIONS,
  type BlockType,
} from "@/components/page-editor/block-registry";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BlockListItem } from "@/responses/blocks";

const ELEMENT_ICONS: Record<BlockType, LucideIcon> = {
  section: LayoutTemplateIcon,
  container: BoxIcon,
  grid: Grid2x2Icon,
  card: SquareIcon,
  heading: HeadingIcon,
  text: TypeIcon,
  list: ListIcon,
  listItem: ListTodoIcon,
  image: ImageIcon,
  embed: Code2Icon,
  button: RectangleHorizontalIcon,
  divider: MinusIcon,
  spacer: SpaceIcon,
};

type ElementsPaletteProps = {
  onAdd: (type: BlockType) => void;
  layoutBlocks: BlockListItem[];
  onInsertLayout: (block: BlockListItem) => void;
};

export function ElementsPalette({
  onAdd,
  layoutBlocks,
  onInsertLayout,
}: ElementsPaletteProps) {
  return (
    <div className="flex flex-col gap-4 p-3">
      <TooltipProvider delay={200}>
        <div className="flex flex-wrap gap-1.5">
          {BLOCK_DEFINITIONS.map((def) => {
            const Icon = ELEMENT_ICONS[def.type];
            return (
              <Tooltip key={def.type}>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={def.label}
                      onClick={() => onAdd(def.type)}
                    />
                  }
                >
                  <Icon className="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="bottom">{def.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {layoutBlocks.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Layout blocks
          </p>
          <div className="grid gap-2">
            {layoutBlocks.map((block) => (
              <Button
                key={block.id}
                type="button"
                variant="secondary"
                size="sm"
                className="justify-start"
                onClick={() => onInsertLayout(block)}
              >
                <LayoutTemplateIcon data-icon="inline-start" />
                {block.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
