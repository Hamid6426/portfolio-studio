import { describe, expect, it } from "vitest";

import {
  blockStyleClassName,
  buildTreeStylesheet,
  normalizeResponsiveStyles,
  wrapFlatStyles,
} from "@/lib/blocks/styles";

describe("normalizeResponsiveStyles", () => {
  it("wraps flat v1 maps into base", () => {
    expect(normalizeResponsiveStyles({ color: "red", padding: "8px" })).toEqual(
      { base: { color: "red", padding: "8px" } },
    );
  });

  it("passes through responsive maps", () => {
    const styles = { base: { color: "red" }, sm: { color: "blue" } };
    expect(normalizeResponsiveStyles(styles)).toEqual(styles);
  });
});

describe("buildTreeStylesheet", () => {
  it("emits base rules, container queries, and hover", () => {
    const css = buildTreeStylesheet([
      {
        id: "abc-123",
        styles: {
          base: { padding: "8px", color: "#fff" },
          sm: { padding: "16px" },
          hover: { color: "#0ff" },
        },
      },
    ]);
    expect(css).toContain(".ps-abc-123{");
    expect(css).toContain("padding:8px");
    expect(css).toContain("@container (min-width:640px){.ps-abc-123{padding:16px}}");
    expect(css).toContain(".ps-abc-123:hover{color:#0ff}");
    expect(css).not.toContain("javascript");
  });

  it("drops unsafe declarations", () => {
    const css = buildTreeStylesheet([
      {
        id: "x",
        styles: { base: { color: "expression(alert(1))", width: "10px" } },
      },
    ]);
    expect(css).toContain("width:10px");
    expect(css).not.toContain("expression");
  });
});

describe("blockStyleClassName", () => {
  it("prefixes and strips unsafe characters", () => {
    expect(blockStyleClassName("a/b c")).toBe("ps-abc");
    expect(wrapFlatStyles({ gap: "8px" })).toEqual({ base: { gap: "8px" } });
  });
});
