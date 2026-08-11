"use client";

import { BLOCK_DEFINITIONS, type BlockType } from "@/components/page-editor/block-registry";
import { Button } from "@/components/ui/button";
import type { BlockSummary } from "@/responses/blocks";

type ElementsPaletteProps = {
  onAdd: (type: BlockType) => void;
  layoutBlocks: BlockSummary[];
  onInsertLayout: (block: BlockSummary) => void;
};

export function ElementsPalette({
  onAdd,
  layoutBlocks,
  onInsertLayout,
}: ElementsPaletteProps) {
  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="grid gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Elements
        </p>
        <div className="grid grid-cols-2 gap-2">
          {BLOCK_DEFINITIONS.map((def) => (
            <Button
              key={def.type}
              type="button"
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => onAdd(def.type)}
            >
              {def.label}
            </Button>
          ))}
        </div>
      </div>

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
                {block.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
