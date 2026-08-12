"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

type InlineEditableTextProps = {
  tag: ElementType;
  text: string;
  className?: string;
  /** When true, Enter inserts a newline; otherwise Enter commits. */
  multiline?: boolean;
  selected?: boolean;
  onSelect: () => void;
  onChange: (text: string) => void;
  /** Extra DOM props (data-block-id, etc.). */
  domProps?: Record<string, unknown>;
};

/**
 * Canvas text editing: click selects, double-click (or Enter when selected)
 * enters contentEditable. Commits on blur; Escape cancels.
 */
export function InlineEditableText({
  tag: Tag,
  text,
  className,
  multiline = false,
  selected = false,
  onSelect,
  onChange,
  domProps,
}: InlineEditableTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const draftRef = useRef(text);

  useEffect(() => {
    if (!editing) {
      draftRef.current = text;
      if (ref.current && ref.current.textContent !== text) {
        ref.current.textContent = text;
      }
    }
  }, [text, editing]);

  useEffect(() => {
    if (!editing || !ref.current) return;
    const el = ref.current;
    el.textContent = draftRef.current;
    el.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [editing]);

  function startEditing(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    draftRef.current = text;
    setEditing(true);
  }

  function commit() {
    if (!editing) return;
    const next = normalizeEditableText(draftRef.current, multiline);
    setEditing(false);
    if (next !== text) onChange(next);
  }

  function cancel() {
    draftRef.current = text;
    if (ref.current) ref.current.textContent = text;
    setEditing(false);
  }

  function onInput() {
    const raw = ref.current?.innerText ?? "";
    draftRef.current = raw;
    onChange(normalizeEditableText(raw, multiline));
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!editing) {
      if (selected && (event.key === "Enter" || event.key === "F2")) {
        event.preventDefault();
        event.stopPropagation();
        draftRef.current = text;
        setEditing(true);
      }
      return;
    }

    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }

    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      commit();
    }
  }

  return (
    <Tag
      {...domProps}
      ref={ref as never}
      className={cn(
        className,
        multiline && "whitespace-pre-wrap",
        editing &&
          "cursor-text outline outline-2 outline-amber-400/80 outline-offset-2",
      )}
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck={editing}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        onSelect();
      }}
      onDoubleClick={startEditing}
      onKeyDown={onKeyDown}
      onInput={editing ? onInput : undefined}
      onBlur={() => {
        if (editing) commit();
      }}
      onPointerDown={(event: PointerEvent) => {
        if (editing) event.stopPropagation();
      }}
    >
      {editing ? undefined : text}
    </Tag>
  );
}

/** Collapse contentEditable artefacts; keep real newlines for multiline. */
export function normalizeEditableText(
  value: string,
  multiline: boolean,
): string {
  const normalised = value.replace(/\u00a0/g, " ").replace(/\r\n?/g, "\n");
  if (!multiline) {
    return normalised.replace(/\n+/g, " ").trimEnd();
  }
  return normalised.replace(/\n+$/g, "");
}
