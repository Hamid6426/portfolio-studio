import { describe, expect, it } from "vitest";

import {
  MAX_BLOCK_NODE_DEPTH,
  blockNodeTreeSchema,
} from "@/payloads/block-node";

function deepTree(depth: number): unknown {
  let node: Record<string, unknown> = {
    id: "leaf",
    type: "text",
    props: { text: "x" },
  };
  for (let i = depth - 1; i >= 1; i -= 1) {
    node = {
      id: `n${i}`,
      type: "section",
      props: {},
      children: [node],
    };
  }
  return [node];
}

describe("blockNodeTreeSchema", () => {
  it("accepts a shallow tree", () => {
    const result = blockNodeTreeSchema.safeParse([
      { id: "1", type: "text", props: { text: "hi" } },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects a tree deeper than MAX_BLOCK_NODE_DEPTH without overflowing", () => {
    const result = blockNodeTreeSchema.safeParse(
      deepTree(MAX_BLOCK_NODE_DEPTH + 1),
    );
    expect(result.success).toBe(false);
  });

  it("accepts a tree at the max depth", () => {
    const result = blockNodeTreeSchema.safeParse(deepTree(MAX_BLOCK_NODE_DEPTH));
    expect(result.success).toBe(true);
  });

  it("migrates flat v1 style maps into { base } instead of stripping them", () => {
    const result = blockNodeTreeSchema.safeParse([
      {
        id: "1",
        type: "text",
        props: { text: "hi" },
        styles: { width: "100%", padding: "8px" },
      },
    ]);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0]?.styles).toEqual({
      base: { width: "100%", padding: "8px" },
    });
  });

  it("keeps responsive v2 styles intact", () => {
    const result = blockNodeTreeSchema.safeParse([
      {
        id: "1",
        type: "text",
        props: { text: "hi" },
        styles: { base: { color: "red" }, md: { color: "blue" } },
      },
    ]);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0]?.styles).toEqual({
      base: { color: "red" },
      md: { color: "blue" },
    });
  });
});
