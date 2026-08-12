import { describe, expect, it } from "vitest";

import { normalizeEditableText } from "@/components/page-editor/inline-editable-text";

describe("normalizeEditableText", () => {
  it("flattens newlines for single-line fields", () => {
    expect(normalizeEditableText("Hello\nWorld", false)).toBe("Hello World");
  });

  it("keeps interior newlines for multiline text", () => {
    expect(normalizeEditableText("a\nb\n\nc\n", true)).toBe("a\nb\n\nc");
  });

  it("normalises nbsp and CR", () => {
    expect(normalizeEditableText("a\u00a0b\r\nc", true)).toBe("a b\nc");
  });
});
