import { describe, expect, it } from "vitest";

import {
  clearEditorClipboard,
  getEditorClipboard,
  hasEditorClipboard,
  isClipboardPayload,
  parseClipboardText,
  serializeClipboard,
  setEditorClipboard,
} from "@/components/page-editor/editor-clipboard";
import type { BlockNode } from "@/db/schema.types";

function text(id: string, value: string): BlockNode {
  return { id, type: "text", props: { text: value } };
}

describe("editor clipboard memory", () => {
  it("stores a deep copy", () => {
    clearEditorClipboard();
    expect(hasEditorClipboard()).toBe(false);

    const node = text("a", "hello");
    setEditorClipboard([node]);
    expect(hasEditorClipboard()).toBe(true);

    node.props.text = "mutated";
    expect(getEditorClipboard()[0]?.props.text).toBe("hello");
  });
});

describe("serialize / parse clipboard", () => {
  it("round-trips valid payloads", () => {
    const nodes = [text("a", "x")];
    const raw = serializeClipboard(nodes);
    expect(parseClipboardText(raw)).toEqual(nodes);
  });

  it("rejects unrelated JSON", () => {
    expect(parseClipboardText("{}")).toBeNull();
    expect(parseClipboardText("not-json")).toBeNull();
    expect(
      isClipboardPayload({
        v: 1,
        kind: "portfolio-studio-blocks",
        nodes: [{ id: "a", type: "text" }],
      }),
    ).toBe(false);
  });
});
