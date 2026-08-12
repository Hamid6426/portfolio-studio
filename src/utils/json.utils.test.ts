import { describe, expect, it } from "vitest";

import { stableStringify } from "@/utils/json.utils";

describe("stableStringify", () => {
  it("sorts object keys recursively so jsonb reorder matches", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(
      stableStringify({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });

  it("preserves array order", () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });
});
