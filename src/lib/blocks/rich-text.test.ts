import { describe, expect, it } from "vitest";

import {
  coalesceSpans,
  normalizeRichTextProps,
  plainTextFromSpans,
  richTextPropsPatch,
  spansFromPlainText,
  spansToEditorHtml,
} from "@/lib/blocks/rich-text";

describe("normalizeRichTextProps", () => {
  it("wraps plain text as a single span", () => {
    expect(normalizeRichTextProps({ text: "Hello" })).toEqual({
      text: "Hello",
      spans: [{ text: "Hello" }],
    });
  });

  it("prefers spans and resyncs text", () => {
    expect(
      normalizeRichTextProps({
        text: "stale",
        spans: [
          { text: "Hi", marks: { bold: true } },
          { text: " there" },
        ],
      }),
    ).toEqual({
      text: "Hi there",
      spans: [
        { text: "Hi", marks: { bold: true } },
        { text: " there" },
      ],
    });
  });

  it("drops unsafe link schemes", () => {
    const normalised = normalizeRichTextProps({
      text: "x",
      spans: [{ text: "x", marks: { href: "javascript:alert(1)" } }],
    });
    expect(normalised.spans[0]?.marks).toBeUndefined();
  });
});

describe("coalesceSpans", () => {
  it("merges adjacent spans with matching marks", () => {
    expect(
      coalesceSpans([
        { text: "a", marks: { bold: true } },
        { text: "b", marks: { bold: true } },
        { text: "c" },
      ]),
    ).toEqual([
      { text: "ab", marks: { bold: true } },
      { text: "c" },
    ]);
  });
});

describe("richTextPropsPatch", () => {
  it("keeps text in sync", () => {
    expect(
      richTextPropsPatch([
        { text: "Go", marks: { italic: true } },
        { text: " home" },
      ]),
    ).toEqual({
      text: "Go home",
      spans: [
        { text: "Go", marks: { italic: true } },
        { text: " home" },
      ],
    });
  });
});

describe("spansToEditorHtml", () => {
  it("escapes text and emits mark tags", () => {
    expect(
      spansToEditorHtml(
        [
          { text: "A<B>", marks: { bold: true, italic: true } },
          { text: " link", marks: { href: "https://example.com" } },
        ],
        false,
      ),
    ).toBe(
      '<em><strong>A&lt;B&gt;</strong></em><a href="https://example.com"> link</a>',
    );
  });

  it("turns newlines into br when multiline", () => {
    expect(spansToEditorHtml(spansFromPlainText("a\nb"), true)).toBe(
      "a<br>b",
    );
  });
});

describe("plainTextFromSpans", () => {
  it("concatenates", () => {
    expect(plainTextFromSpans([{ text: "a" }, { text: "b" }])).toBe("ab");
  });
});
