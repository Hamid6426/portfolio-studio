"use client";

import { createContext, useContext, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type Over,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";

import {
  definitionFor,
  renderBlockTree,
} from "@/components/page-editor/block-registry";
import {
  containsNode,
  findNode,
  findParent,
} from "@/components/page-editor/tree-ops";
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
  /** Owning container, `null` at the root of the document. */
  parentId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Where the dragged node will land, in `moveNode` coordinates. */
type DropTarget = { parentId: string | null; index: number };

/** Which edge of which block the indicator line is drawn against. */
type DropIndicator = { overId: string; side: "before" | "after" } | null;

type DropState = { target: DropTarget; indicator: DropIndicator };

/**
 * Empty containers register their own droppable under a prefixed id so that a
 * zero-height section is still a landing zone. The prefix keeps these ids from
 * colliding with block ids.
 */
const CONTAINER_DROP_PREFIX = "container-drop:";

function containerDropId(parentId: string): string {
  return `${CONTAINER_DROP_PREFIX}${parentId}`;
}

function parseContainerDropId(id: string): string | null {
  return id.startsWith(CONTAINER_DROP_PREFIX)
    ? id.slice(CONTAINER_DROP_PREFIX.length)
    : null;
}

const DropIndicatorContext = createContext<DropIndicator>(null);

/** Live pointer Y in viewport space, derived from the activator + drag delta. */
function pointerY(event: {
  activatorEvent: Event;
  delta: { y: number };
}): number | null {
  const activator = event.activatorEvent;
  // PointerEvent extends MouseEvent, so this covers mouse, pen and touch-pointer.
  if (activator instanceof MouseEvent) {
    return activator.clientY + event.delta.y;
  }
  if (typeof TouchEvent !== "undefined" && activator instanceof TouchEvent) {
    const touch = activator.touches[0] ?? activator.changedTouches[0];
    return touch ? touch.clientY + event.delta.y : null;
  }
  return null;
}

/**
 * Resolve the drop target for the current pointer position.
 *
 * The returned index is measured against the destination sibling list **with
 * the dragged node already removed**, which is the coordinate space `moveNode`
 * expects. Computing it against the pre-removal list makes downward drags land
 * one slot short.
 */
function resolveDrop(
  content: BlockNode[],
  activeId: string,
  over: Over,
  pointer: number | null,
): DropState | null {
  const overId = String(over.id);

  // Dropped onto the placeholder of an empty container.
  const containerId = parseContainerDropId(overId);
  if (containerId) {
    if (containsNode(content, activeId, containerId)) return null;
    return {
      target: { parentId: containerId, index: 0 },
      indicator: null,
    };
  }

  if (overId === activeId) return null;

  const overLoc = findParent(content, overId);
  if (!overLoc) return null;

  const parentId = overLoc.parent?.id ?? null;

  // Never drop a node inside itself or one of its own descendants.
  if (parentId && containsNode(content, activeId, parentId)) return null;

  const siblings = overLoc.siblings.filter((node) => node.id !== activeId);
  const overIndex = siblings.findIndex((node) => node.id === overId);
  if (overIndex === -1) return null;

  const overCenter = over.rect.top + over.rect.height / 2;
  const side: "before" | "after" =
    pointer !== null && pointer > overCenter ? "after" : "before";

  return {
    target: { parentId, index: overIndex + (side === "after" ? 1 : 0) },
    indicator: { overId, side },
  };
}

function sameDropState(a: DropState | null, b: DropState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.target.parentId === b.target.parentId &&
    a.target.index === b.target.index &&
    a.indicator?.overId === b.indicator?.overId &&
    a.indicator?.side === b.indicator?.side
  );
}

function DropLine({ side }: { side: "before" | "after" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 z-20 h-0.5 rounded-full bg-sky-400",
        side === "before" ? "top-0" : "bottom-0",
      )}
    >
      <span className="absolute -top-0.75 -left-px size-2 rounded-full border-2 border-sky-400 bg-background" />
    </div>
  );
}

function EmptyContainerDropZone({ parentId }: { parentId: string }) {
  const { isOver, setNodeRef } = useDroppable({ id: containerDropId(parentId) });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-16 items-center justify-center rounded-md border border-dashed px-3 py-4 text-[11px] transition-colors",
        isOver
          ? "border-sky-400 bg-sky-400/10 text-sky-400"
          : "border-border/70 text-muted-foreground",
      )}
    >
      {isOver ? "Release to drop here" : "Empty — drag blocks here"}
    </div>
  );
}

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
  const indicator = useContext(DropIndicatorContext);

  const isSelected = selectedId === node.id;
  const showBefore =
    indicator?.overId === node.id && indicator.side === "before";
  const showAfter = indicator?.overId === node.id && indicator.side === "after";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn("relative", isDragging ? "cursor-grabbing" : "cursor-grab")}
      // Pointer listeners stay on every wrapper so any block can be grabbed
      // directly; dnd-kit marks the native event as captured, so the innermost
      // block wins and nested activators never fight over the same gesture.
      {...listeners}
      // The sortable a11y attributes (role, tabIndex, aria-roledescription,
      // aria-describedby) are scoped to the selected block. Spreading them on
      // every wrapper turned each nested block into a tab stop and duplicated
      // the same roledescription down the whole tree.
      {...(isSelected ? attributes : null)}
    >
      {showBefore ? <DropLine side="before" /> : null}
      {renderBlockTree([node], {
        editable: true,
        selectedId,
        onSelect,
        renderChildren: (children, parent) => (
          <SortableTree
            nodes={children}
            parentId={parent.id}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ),
      })}
      {showAfter ? <DropLine side="after" /> : null}
    </div>
  );
}

function SortableTree({
  nodes,
  parentId,
  selectedId,
  onSelect,
}: SortableTreeProps) {
  if (nodes.length === 0) {
    // A container with no children has no sortable items and would otherwise
    // collapse into an undroppable void.
    return parentId ? <EmptyContainerDropZone parentId={parentId} /> : null;
  }

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

function DragPreview({ node }: { node: BlockNode }) {
  const label = definitionFor(node.type)?.label ?? node.type;

  return (
    <div className="flex w-fit items-center gap-1.5 rounded-md border border-sky-400/60 bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow-lg">
      <GripVerticalIcon className="size-3.5 opacity-60" />
      {label}
    </div>
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropState | null>(null);

  const activeNode = activeId ? findNode(content, activeId) : null;

  function reset() {
    setActiveId(null);
    setDrop(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setDrop(null);
  }

  function handleDragMove(event: DragMoveEvent) {
    const { active, over } = event;
    const next = over
      ? resolveDrop(content, String(active.id), over, pointerY(event))
      : null;
    // Fires on every pointer move; only re-render when the landing slot moves.
    setDrop((current) => (sameDropState(current, next) ? current : next));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const nodeId = String(active.id);
    const resolved = over
      ? resolveDrop(content, nodeId, over, pointerY(event))
      : null;
    const target = resolved?.target ?? drop?.target ?? null;

    reset();
    if (!target) return;

    onReorder(nodeId, target.parentId, target.index);
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
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={reset}
          >
            <DropIndicatorContext.Provider value={drop?.indicator ?? null}>
              <SortableTree
                nodes={content}
                parentId={null}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            </DropIndicatorContext.Provider>
            <DragOverlay dropAnimation={null}>
              {activeNode ? <DragPreview node={activeNode} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
