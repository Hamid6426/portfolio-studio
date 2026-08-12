import type { ReactNode } from "react";
import { Fragment } from "react";

import { isExternalUrl, sanitizeUrl } from "@/lib/block-sanitize";

/** Inline marks on a contiguous run of text. */
export type TextMarks = {
  bold?: boolean;
  italic?: boolean;
  /** Sanitised link target; omit / empty = not a link. */
  href?: string;
};

export type TextSpan = {
  text: string;
  marks?: TextMarks;
};

export type NormalizedRichText = {
  text: string;
  spans: TextSpan[];
};

function marksKey(marks: TextMarks | undefined): string {
  if (!marks) return "";
  return [
    marks.bold ? "b" : "",
    marks.italic ? "i" : "",
    marks.href ? `a:${marks.href}` : "",
  ].join("|");
}

function cleanMarks(marks: TextMarks | undefined): TextMarks | undefined {
  if (!marks) return undefined;
  const next: TextMarks = {};
  if (marks.bold) next.bold = true;
  if (marks.italic) next.italic = true;
  if (marks.href) {
    const href = sanitizeUrl(marks.href, "");
    if (href && href !== "#") next.href = href;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

/** Merge adjacent spans that share the same marks. */
export function coalesceSpans(spans: TextSpan[]): TextSpan[] {
  const out: TextSpan[] = [];
  for (const span of spans) {
    if (!span.text) continue;
    const marks = cleanMarks(span.marks);
    const prev = out.at(-1);
    if (prev && marksKey(prev.marks) === marksKey(marks)) {
      prev.text += span.text;
      continue;
    }
    out.push(marks ? { text: span.text, marks } : { text: span.text });
  }
  return out;
}

export function plainTextFromSpans(spans: TextSpan[]): string {
  return spans.map((span) => span.text).join("");
}

export function spansFromPlainText(text: string): TextSpan[] {
  return text ? [{ text }] : [];
}

function isSpanArray(value: unknown): value is TextSpan[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as TextSpan).text === "string",
  );
}

/**
 * Read `props.text` / optional `props.spans` into a normalised pair.
 * Legacy plain text becomes a single unmarked span.
 */
export function normalizeRichTextProps(
  props: Record<string, unknown> | null | undefined,
): NormalizedRichText {
  const rawText = typeof props?.text === "string" ? props.text : "";
  if (isSpanArray(props?.spans) && props.spans.length > 0) {
    const spans = coalesceSpans(
      props.spans.map((span) => ({
        text: span.text,
        marks: cleanMarks(span.marks),
      })),
    );
    return {
      text: plainTextFromSpans(spans) || rawText,
      spans: spans.length > 0 ? spans : spansFromPlainText(rawText),
    };
  }
  return {
    text: rawText,
    spans: spansFromPlainText(rawText),
  };
}

/** Props patch when saving rich text (keeps `text` in sync for seeds/layers). */
export function richTextPropsPatch(spans: TextSpan[]): {
  text: string;
  spans: TextSpan[];
} {
  const normalised = coalesceSpans(spans);
  return {
    text: plainTextFromSpans(normalised),
    spans: normalised,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML for contentEditable (only tags we round-trip). */
export function spansToEditorHtml(
  spans: TextSpan[],
  multiline: boolean,
): string {
  return coalesceSpans(spans)
    .map((span) => {
      let html = escapeHtml(span.text);
      if (multiline) {
        html = html.replace(/\n/g, "<br>");
      }
      if (span.marks?.bold) html = `<strong>${html}</strong>`;
      if (span.marks?.italic) html = `<em>${html}</em>`;
      if (span.marks?.href) {
        const href = sanitizeUrl(span.marks.href, "");
        if (href && href !== "#") {
          html = `<a href="${escapeHtml(href)}">${html}</a>`;
        }
      }
      return html;
    })
    .join("");
}

/**
 * Walk a contentEditable root into spans. Unknown tags are unwrapped;
 * only strong/b, em/i, a[href], and br are recognised.
 */
export function spansFromEditorElement(
  root: HTMLElement,
  multiline: boolean,
): TextSpan[] {
  const spans: TextSpan[] = [];

  function walk(node: Node, marks: TextMarks) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) spans.push({ text, marks: cleanMarks(marks) });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "br") {
      if (multiline) spans.push({ text: "\n", marks: cleanMarks(marks) });
      return;
    }

    if (tag === "script" || tag === "style") return;

    const next: TextMarks = { ...marks };
    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "em" || tag === "i") next.italic = true;
    if (tag === "a") {
      const href = sanitizeUrl(el.getAttribute("href"), "");
      if (href && href !== "#") next.href = href;
    }

    for (const child of Array.from(el.childNodes)) {
      walk(child, next);
    }
  }

  walk(root, {});
  return coalesceSpans(spans);
}

/** Safe React rendering for public + editor (non-editing) views. */
export function renderRichTextSpans(
  spans: TextSpan[],
  options: { editableLinks?: boolean } = {},
): ReactNode {
  const list = coalesceSpans(spans);
  if (list.length === 0) return null;

  return list.map((span, index) => {
    let node: ReactNode = span.text;
    if (span.marks?.italic) {
      node = <em>{node}</em>;
    }
    if (span.marks?.bold) {
      node = <strong>{node}</strong>;
    }
    if (span.marks?.href) {
      const href = sanitizeUrl(span.marks.href, "");
      if (href && href !== "#") {
        node = (
          <a
            href={options.editableLinks === false ? undefined : href}
            rel={
              options.editableLinks !== false && isExternalUrl(href)
                ? "noopener noreferrer"
                : undefined
            }
            onClick={
              options.editableLinks === false
                ? (event) => event.preventDefault()
                : undefined
            }
          >
            {node}
          </a>
        );
      }
    }
    return <Fragment key={index}>{node}</Fragment>;
  });
}
