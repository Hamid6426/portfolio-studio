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

import {
  normalizeRichTextProps,
  renderRichTextSpans,
  richTextPropsPatch,
  spansFromEditorElement,
  spansToEditorHtml,
  type TextSpan,
} from "@/lib/blocks/rich-text";
import { cn } from "@/lib/utils";

type InlineEditableTextProps = {
  tag: ElementType;
  text: string;
  /** When set, rendered/edited as rich text (bold / italic / links). */
  spans?: TextSpan[];
  className?: string;
  /** When true, Enter inserts a newline; otherwise Enter commits. */
  multiline?: boolean;
  /** Allow link marks (heading / text / listItem). */
  allowLinks?: boolean;
  selected?: boolean;
  onSelect: () => void;
  onChange: (next: { text: string; spans: TextSpan[] }) => void;
  /** Extra DOM props (data-block-id, etc.). */
  domProps?: Record<string, unknown>;
};

/**
 * Canvas text editing: click selects, double-click (or Enter when selected)
 * enters contentEditable. Commits on blur; Escape cancels.
 * While editing: Ctrl/Cmd+B bold, Ctrl/Cmd+I italic, Ctrl/Cmd+K link.
 */
export function InlineEditableText({
  tag: Tag,
  text,
  spans: spansProp,
  className,
  multiline = false,
  allowLinks = true,
  selected = false,
  onSelect,
  onChange,
  domProps,
}: InlineEditableTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const normalised = normalizeRichTextProps({ text, spans: spansProp });
  const draftSpansRef = useRef(normalised.spans);

  useEffect(() => {
    if (!editing) {
      draftSpansRef.current = normalised.spans;
    }
  }, [editing, normalised.spans, normalised.text]);

  useEffect(() => {
    if (!editing || !ref.current) return;
    const el = ref.current;
    el.innerHTML = spansToEditorHtml(draftSpansRef.current, multiline);
    el.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [editing, multiline]);

  function readSpans(): TextSpan[] {
    if (!ref.current) return draftSpansRef.current;
    return spansFromEditorElement(ref.current, multiline);
  }

  function emit(spans: TextSpan[]) {
    const patch = richTextPropsPatch(spans);
    draftSpansRef.current = patch.spans;
    onChange(patch);
  }

  function startEditing(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    draftSpansRef.current = normalised.spans;
    setEditing(true);
  }

  function commit() {
    if (!editing) return;
    const spans = readSpans();
    setEditing(false);
    const patch = richTextPropsPatch(spans);
    if (
      patch.text !== normalised.text ||
      JSON.stringify(patch.spans) !== JSON.stringify(normalised.spans)
    ) {
      onChange(patch);
    }
  }

  function cancel() {
    draftSpansRef.current = normalised.spans;
    if (ref.current) {
      ref.current.innerHTML = spansToEditorHtml(normalised.spans, multiline);
    }
    setEditing(false);
  }

  function onInput() {
    emit(readSpans());
  }

  function toggleLink() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }
    const existing = document.queryCommandValue("createLink");
    if (existing && existing !== "false") {
      document.execCommand("unlink");
      emit(readSpans());
      return;
    }
    const href = window.prompt("Link URL", "https://");
    if (href == null) return;
    const trimmed = href.trim();
    if (!trimmed) {
      document.execCommand("unlink");
    } else {
      document.execCommand("createLink", false, trimmed);
    }
    emit(readSpans());
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!editing) {
      if (selected && (event.key === "Enter" || event.key === "F2")) {
        event.preventDefault();
        event.stopPropagation();
        draftSpansRef.current = normalised.spans;
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

    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === "b") {
      event.preventDefault();
      document.execCommand("bold");
      emit(readSpans());
      return;
    }
    if (mod && event.key.toLowerCase() === "i") {
      event.preventDefault();
      document.execCommand("italic");
      emit(readSpans());
      return;
    }
    if (mod && allowLinks && event.key.toLowerCase() === "k") {
      event.preventDefault();
      toggleLink();
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
      {editing
        ? undefined
        : renderRichTextSpans(normalised.spans, { editableLinks: false })}
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
