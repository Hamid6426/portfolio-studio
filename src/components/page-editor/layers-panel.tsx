"use client";

import { definitionFor } from "@/components/page-editor/block-registry";
import { flattenTree } from "@/components/page-editor/tree-ops";
import type { BlockNode } from "@/db/schema";
import { cn } from "@/lib/utils";

type LayersPanelProps = {
  content: BlockNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function LayersPanel({
  content,
  selectedId,
  onSelect,
}: LayersPanelProps) {
  const rows = flattenTree(content);

  if (rows.length === 0) {
    return (
      <p className="p-3 text-sm text-muted-foreground">No layers yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {rows.map(({ node, depth }) => {
        const def = definitionFor(node.type);
        const label =
          typeof node.props.text === "string" && node.props.text
            ? `${def?.label ?? node.type}: ${node.props.text.slice(0, 24)}`
            : (def?.label ?? node.type);

        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node.id)}
            className={cn(
              "rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60",
              selectedId === node.id && "bg-muted text-foreground",
            )}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
