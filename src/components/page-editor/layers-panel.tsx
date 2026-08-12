"use client";

import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  CopyIcon,
  ScissorsIcon,
} from "lucide-react";

import { definitionFor } from "@/components/page-editor/block-registry";
import { findParent, flattenTree } from "@/components/page-editor/tree-ops";
import { Button } from "@/components/ui/button";
import type { BlockNode } from "@/db/schema.types";
import { cn } from "@/lib/utils";

type LayersPanelProps = {
  content: BlockNode[];
  selectedId: string | null;
  canPaste: boolean;
  onSelect: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOutdent: () => void;
  onIndent: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
};

function moveAvailability(content: BlockNode[], selectedId: string | null) {
  if (!selectedId) {
    return {
      canMoveUp: false,
      canMoveDown: false,
      canOutdent: false,
      canIndent: false,
    };
  }

  const located = findParent(content, selectedId);
  if (!located) {
    return {
      canMoveUp: false,
      canMoveDown: false,
      canOutdent: false,
      canIndent: false,
    };
  }

  const prev =
    located.index > 0 ? located.siblings[located.index - 1]! : null;

  return {
    canMoveUp: located.index > 0,
    canMoveDown: located.index < located.siblings.length - 1,
    canOutdent: located.parent !== null,
    canIndent: prev !== null && prev.children !== undefined,
  };
}

export function LayersPanel({
  content,
  selectedId,
  canPaste,
  onSelect,
  onMoveUp,
  onMoveDown,
  onOutdent,
  onIndent,
  onDuplicate,
  onCopy,
  onCut,
  onPaste,
}: LayersPanelProps) {
  const rows = flattenTree(content);
  const moves = moveAvailability(content, selectedId);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <p className="text-sm text-muted-foreground">No layers yet.</p>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="w-fit"
          aria-label="Paste"
          title="Paste (Ctrl/Cmd+V)"
          disabled={!canPaste}
          onClick={onPaste}
        >
          <ClipboardPasteIcon />
          Paste
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="mb-1 flex flex-wrap gap-1 px-0.5">
        {selectedId ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label="Move up"
              title="Move up"
              disabled={!moves.canMoveUp}
              onClick={onMoveUp}
            >
              <ArrowUpIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label="Move down"
              title="Move down"
              disabled={!moves.canMoveDown}
              onClick={onMoveDown}
            >
              <ArrowDownIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label="Outdent"
              title="Outdent"
              disabled={!moves.canOutdent}
              onClick={onOutdent}
            >
              <ArrowLeftIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label="Indent"
              title="Indent"
              disabled={!moves.canIndent}
              onClick={onIndent}
            >
              <ArrowRightIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label="Duplicate"
              title="Duplicate (Ctrl/Cmd+D)"
              onClick={onDuplicate}
            >
              <CopyIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label="Copy"
              title="Copy (Ctrl/Cmd+C)"
              onClick={onCopy}
            >
              <ClipboardCopyIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label="Cut"
              title="Cut (Ctrl/Cmd+X)"
              onClick={onCut}
            >
              <ScissorsIcon />
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="xs"
          aria-label="Paste"
          title="Paste (Ctrl/Cmd+V)"
          disabled={!canPaste}
          onClick={onPaste}
        >
          <ClipboardPasteIcon />
        </Button>
      </div>

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
