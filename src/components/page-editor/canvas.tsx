"use client";

import { createContext, useContext, useState } from "react";
import {
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
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
import { InlineEditableText } from "@/components/page-editor/inline-editable-text";
import {
  containsNode,
  findNode,
  findParent,
} from "@/components/page-editor/tree-ops";
import { SiteThemeStyle } from "@/components/site-theme-style";
import type { BlockNode } from "@/db/schema.types";
import type { TextSpan } from "@/lib/blocks/rich-text";
import { useSiteThemeQuery } from "@/queries/themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ViewportWidth = 360 | 768 | "full";

const VIEWPORT_MAX_WIDTH: Record<ViewportWidth, string> = {
  360: "max-w-[360px]",
  768: "max-w-[768px]",
  full: "max-w-4xl",
};

type CanvasProps = {
  content: BlockNode[];
  selectedId: string | null;
  selectedIds: readonly string[];
  onSelect: (
    id: string | null,
    options?: { toggle?: boolean; range?: boolean },
  ) => void;
  onReorder: (nodeId: string, parentId: string | null, index: number) => void;
  /** Update a node's text / optional rich spans (inline canvas editing). */
  onTextChange: (
    nodeId: string,
    next: { text: string; spans: TextSpan[] },
  ) => void;
};

type SortableTreeProps = {
  nodes: BlockNode[];
  /** Owning container, `null` at the root of the document. */
  parentId: string | null;
  selectedId: string | null;
  selectedIds: readonly string[];
  onSelect: (
    id: string,
    options?: { toggle?: boolean; range?: boolean },
  ) => void;
  onTextChange: (
    nodeId: string,
    next: { text: string; spans: TextSpan[] },
  ) => void;
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

/** Live pointer Y in viewport space. Prefers dnd-kit's translated rect (scroll-safe). */
function pointerY(event: {
  active: Active;
  activatorEvent: Event;
  delta: { y: number };
}): number | null {
  const translated = event.active.rect.current.translated;
  if (translated) {
    return translated.top + translated.height / 2;
  }

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
  selectedIds,
  onSelect,
  onTextChange,
}: {
  node: BlockNode;
  selectedId: string | null;
  selectedIds: readonly string[];
  onSelect: (
    id: string,
    options?: { toggle?: boolean; range?: boolean },
  ) => void;
  onTextChange: (
    nodeId: string,
    next: { text: string; spans: TextSpan[] },
  ) => void;
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  const indicator = useContext(DropIndicatorContext);

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
      // Sortable a11y attributes (role, tabIndex, space-to-pick-up) are omitted:
      // this editor uses pointer drag only, and spreading them duplicated tab
      // stops and screen-reader hints down the nested tree.
    >
      {showBefore ? <DropLine side="before" /> : null}
      {renderBlockTree([node], {
        editable: true,
        selectedId,
        selectedIds,
        onSelect,
        renderEditableText: ({
          node: textNode,
          tag,
          text,
          spans,
          multiline,
          allowLinks,
          className,
          domProps,
        }) => (
          <InlineEditableText
            tag={tag}
            text={text}
            spans={spans}
            multiline={multiline}
            allowLinks={allowLinks}
            selected={selectedIds.includes(textNode.id)}
            className={className}
            domProps={domProps}
            onSelect={() => onSelect(textNode.id)}
            onChange={(next) => onTextChange(textNode.id, next)}
          />
        ),
        renderChildren: (children, parent) => (
          <SortableTree
            nodes={children}
            parentId={parent.id}
            selectedId={selectedId}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onTextChange={onTextChange}
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
  selectedIds,
  onSelect,
  onTextChange,
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
            selectedIds={selectedIds}
            onSelect={onSelect}
            onTextChange={onTextChange}
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
  selectedIds,
  onSelect,
  onReorder,
  onTextChange,
}: CanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropState | null>(null);
  const [viewport, setViewport] = useState<ViewportWidth>("full");
  const themeQuery = useSiteThemeQuery();
  const theme = themeQuery.data?.success ? themeQuery.data.data : null;

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
      className="relative min-h-0 flex-1 overflow-y-auto bg-zinc-950 p-8"
      onClick={() => onSelect(null)}
    >
      <div className="sticky top-3 z-10 -mt-3 mb-1 flex justify-end gap-1 pointer-events-none">
        <Button
          type="button"
          variant={viewport === 360 ? "secondary" : "ghost"}
          size="icon-sm"
          className="pointer-events-auto size-8 bg-background/90 shadow-sm"
          aria-label="360px preview width"
          title="360px"
          onClick={(event) => {
            event.stopPropagation();
            setViewport(360);
          }}
        >
          <SmartphoneIcon className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant={viewport === 768 ? "secondary" : "ghost"}
          size="icon-sm"
          className="pointer-events-auto size-8 bg-background/90 shadow-sm"
          aria-label="768px preview width"
          title="768px"
          onClick={(event) => {
            event.stopPropagation();
            setViewport(768);
          }}
        >
          <TabletIcon className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant={viewport === "full" ? "secondary" : "ghost"}
          size="icon-sm"
          className="pointer-events-auto size-8 bg-background/90 shadow-sm"
          aria-label="Full preview width"
          title="Full width"
          onClick={(event) => {
            event.stopPropagation();
            setViewport("full");
          }}
        >
          <MonitorIcon className="size-3.5" />
        </Button>
      </div>
      <div
        className={cn(
          "ps-site mx-auto min-h-[70vh] rounded-xl shadow-2xl ring-1 ring-border transition-[max-width] duration-200",
          VIEWPORT_MAX_WIDTH[viewport],
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {theme ? (
          <SiteThemeStyle
            themeId={theme.themeId}
            themeSettings={theme.themeSettings}
          />
        ) : null}
        {content.length === 0 ? (
          <div className="ps-muted flex min-h-[50vh] flex-col items-center justify-center gap-2 p-10 text-center text-sm">
            <p>Empty canvas</p>
            <p>Add elements from the right sidebar to start building.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            measuring={{
              droppable: { strategy: MeasuringStrategy.Always },
            }}
            accessibility={{
              screenReaderInstructions: {
                draggable:
                  "Press and hold a block, then drag to reorder on the canvas. Use the Layers panel for structure changes.",
              },
            }}
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
                selectedIds={selectedIds}
                onSelect={onSelect}
                onTextChange={onTextChange}
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
