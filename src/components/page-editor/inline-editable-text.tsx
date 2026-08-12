"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
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
  /** When false, text is display-only (viewer role). */
  canEdit?: boolean;
  selected?: boolean;
  onSelect: (options?: { toggle?: boolean; range?: boolean }) => void;
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
  canEdit = true,
  selected = false,
  onSelect,
  onChange,
  domProps,
}: InlineEditableTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const normalised = normalizeRichTextProps({ text, spans: spansProp });
  const draftSpansRef = useRef(normalised.spans);
  /** Snapshot at edit start — Escape restores this (audit C5). */
  const editOriginRef = useRef(normalised);

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

  // Clear leftover contentEditable DOM before React remounts children (audit C2).
  useLayoutEffect(() => {
    if (editing || !ref.current) return;
    ref.current.innerHTML = "";
  }, [editing]);

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
    if (!canEdit) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    editOriginRef.current = normalised;
    draftSpansRef.current = normalised.spans;
    setEditing(true);
  }

  function commit() {
    if (!editing) return;
    const spans = readSpans();
    setEditing(false);
    const patch = richTextPropsPatch(spans);
    if (
      patch.text !== editOriginRef.current.text ||
      JSON.stringify(patch.spans) !== JSON.stringify(editOriginRef.current.spans)
    ) {
      onChange(patch);
    }
  }

  function cancel() {
    const origin = editOriginRef.current;
    draftSpansRef.current = origin.spans;
    setEditing(false);
    if (
      origin.text !== normalised.text ||
      JSON.stringify(origin.spans) !== JSON.stringify(normalised.spans)
    ) {
      onChange(origin);
    }
  }

  function onInput() {
    // Keep a local draft only — do not push into the document on every
    // keystroke so Escape can still restore the pre-edit snapshot (C5).
    draftSpansRef.current = readSpans();
  }

  function selectionInsideLink(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    let node: Node | null = selection.anchorNode;
    while (node && node !== ref.current) {
      if (node instanceof HTMLAnchorElement) return true;
      node = node.parentNode;
    }
    return false;
  }

  function toggleLink() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }
    // queryCommandValue("createLink") is unsupported in Chromium/WebKit (C11).
    if (selectionInsideLink()) {
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

  function onPaste(event: ClipboardEvent) {
    if (!editing) return;
    const plain = event.clipboardData.getData("text/plain");
    event.preventDefault();
    document.execCommand("insertText", false, plain);
    draftSpansRef.current = readSpans();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!editing) {
      if (
        canEdit &&
        selected &&
        (event.key === "Enter" || event.key === "F2")
      ) {
        event.preventDefault();
        event.stopPropagation();
        editOriginRef.current = normalised;
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
      draftSpansRef.current = readSpans();
      return;
    }
    if (mod && event.key.toLowerCase() === "i") {
      event.preventDefault();
      document.execCommand("italic");
      draftSpansRef.current = readSpans();
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
        onSelect({
          toggle: event.metaKey || event.ctrlKey,
          range: event.shiftKey,
        });
      }}
      onDoubleClick={startEditing}
      onKeyDown={onKeyDown}
      onInput={editing ? onInput : undefined}
      onPaste={editing ? onPaste : undefined}
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
