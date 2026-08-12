import { describe, expect, it } from "vitest";

import { DEFAULT_THEME_ID, getTheme, isThemeId } from "@/lib/themes/registry";
import {
  buildThemeStylesheet,
  isSafeColorValue,
  resolveThemeTokens,
  sanitizeThemeSettings,
} from "@/lib/themes/resolve";

describe("theme registry", () => {
  it("falls back to the default theme for unknown ids", () => {
    expect(getTheme("nope").id).toBe(DEFAULT_THEME_ID);
    expect(isThemeId("minimal")).toBe(true);
    expect(isThemeId("nope")).toBe(false);
  });
});

describe("sanitizeThemeSettings", () => {
  it("keeps safe overrides and drops unsafe ones", () => {
    expect(
      sanitizeThemeSettings({
        primaryColor: "#336699",
        radius: "0.5rem",
        sectionSpacing: "48px",
        fontBody: "Georgia, serif",
        evil: "x",
      }),
    ).toEqual({
      primaryColor: "#336699",
      radius: "0.5rem",
      sectionSpacing: "48px",
      fontBody: "Georgia, serif",
    });

    expect(
      sanitizeThemeSettings({
        primaryColor: "url(https://evil)",
        radius: "1rem;background:red",
        fontBody: "x}</style><script>",
      }),
    ).toEqual({});
  });
});

describe("isSafeColorValue", () => {
  it("accepts hex and oklch", () => {
    expect(isSafeColorValue("#fff")).toBe(true);
    expect(isSafeColorValue("oklch(0.5 0.1 40)")).toBe(true);
    expect(isSafeColorValue("javascript:alert(1)")).toBe(false);
  });
});

describe("resolveThemeTokens + stylesheet", () => {
  it("applies overrides and emits container rules without style attributes", () => {
    const tokens = resolveThemeTokens("minimal", {
      primaryColor: "#112233",
      radius: "1rem",
    });
    expect(tokens.primary).toBe("#112233");
    expect(tokens.radius).toBe("1rem");
    expect(tokens.background).toBe(getTheme("minimal").tokens.background);

    const css = buildThemeStylesheet("developer", null);
    expect(css).toContain(".ps-site{");
    expect(css).toContain("--ps-background:");
    expect(css).toContain("color-scheme:dark");
    expect(css).not.toContain("url(");
  });
});
