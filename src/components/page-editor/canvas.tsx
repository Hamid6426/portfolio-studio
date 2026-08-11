"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { renderBlockTree } from "@/components/page-editor/block-registry";
import { findParent } from "@/components/page-editor/tree-ops";
import type { BlockNode } from "@/db/schema";
import { cn } from "@/lib/utils";

type CanvasProps = {
  content: BlockNode[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReorder: (nodeId: string, parentId: string | null, index: number) => void;
};

type SortableTreeProps = {
  nodes: BlockNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function SortableBlock({
  node,
  selectedId,
  onSelect,
}: {
  node: BlockNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn("relative", isDragging ? "cursor-grabbing" : "cursor-grab")}
      {...attributes}
      {...listeners}
    >
      {renderBlockTree([node], {
        editable: true,
        selectedId,
        onSelect,
        renderChildren: (children) => (
          <SortableTree
            nodes={children}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ),
      })}
    </div>
  );
}

function SortableTree({ nodes, selectedId, onSelect }: SortableTreeProps) {
  if (nodes.length === 0) return null;

  return (
    <SortableContext
      items={nodes.map((node) => node.id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="flex flex-col">
        {nodes.map((node) => (
          <SortableBlock
            key={node.id}
            node={node}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </SortableContext>
  );
}

export function EditorCanvas({
  content,
  selectedId,
  onSelect,
  onReorder,
}: CanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeLoc = findParent(content, String(active.id));
    const overLoc = findParent(content, String(over.id));
    if (!activeLoc || !overLoc) return;

    const activeParentId = activeLoc.parent?.id ?? null;
    const overParentId = overLoc.parent?.id ?? null;

    // Reorder within the same parent (root or nested)
    if (activeParentId === overParentId) {
      onReorder(String(active.id), activeParentId, overLoc.index);
    }
  }

  return (
    <div
      className="min-h-full flex-1 bg-zinc-950 p-8"
      onClick={() => onSelect(null)}
    >
      <div
        className={cn(
          "mx-auto min-h-[70vh] max-w-4xl rounded-xl bg-background text-foreground shadow-2xl ring-1 ring-border",
          "overflow-hidden",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {content.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <p>Empty canvas</p>
            <p>Add elements from the right sidebar to start building.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableTree
              nodes={content}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </DndContext>
        )}
      </div>
    </div>
  );
}
