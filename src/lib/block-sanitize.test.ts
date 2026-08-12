import { describe, expect, it } from "vitest";

import {
  sanitizeEmbedUrl,
  sanitizeStyles,
  sanitizeUrl,
} from "@/lib/block-sanitize";

describe("sanitizeUrl", () => {
  it("allows http(s), mailto, tel, root-relative, and hash", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    expect(sanitizeUrl("http://example.com/a")).toBe("http://example.com/a");
    expect(sanitizeUrl("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(sanitizeUrl("tel:+123")).toBe("tel:+123");
    expect(sanitizeUrl("/about")).toBe("/about");
    expect(sanitizeUrl("#section")).toBe("#section");
  });

  it("rejects javascript, data, and protocol-relative hosts", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("#");
    expect(sanitizeUrl("data:text/html,hi")).toBe("#");
    expect(sanitizeUrl("//evil.com")).toBe("#");
    expect(sanitizeUrl("vbscript:x")).toBe("#");
  });

  it("strips control characters used to hide schemes", () => {
    expect(sanitizeUrl("java\tscript:alert(1)")).toBe("#");
    expect(sanitizeUrl("java\nscript:alert(1)")).toBe("#");
  });
});

describe("sanitizeEmbedUrl", () => {
  it("allows https only", () => {
    expect(sanitizeEmbedUrl("https://www.youtube.com/embed/x")).toBe(
      "https://www.youtube.com/embed/x",
    );
    expect(sanitizeEmbedUrl("http://example.com")).toBe("");
    expect(sanitizeEmbedUrl("/local")).toBe("");
    expect(sanitizeEmbedUrl("javascript:alert(1)")).toBe("");
  });
});

describe("sanitizeStyles", () => {
  it("keeps allowlisted safe declarations", () => {
    expect(
      sanitizeStyles({ width: "100%", padding: "16px", color: "#fff" }),
    ).toEqual({ width: "100%", padding: "16px", color: "#fff" });
  });

  it("drops url(), expression, and escapes", () => {
    expect(sanitizeStyles({ background: "url(https://x)" })).toEqual({});
    expect(sanitizeStyles({ color: "expression(alert(1))" })).toEqual({});
    expect(sanitizeStyles({ width: "10px; color: red" })).toEqual({});
    expect(sanitizeStyles({ width: "10\\70x" })).toEqual({});
  });

  it("drops unknown properties", () => {
    expect(sanitizeStyles({ position: "fixed", width: "1px" })).toEqual({
      width: "1px",
    });
  });

  it("allows theme CSS variables", () => {
    expect(
      sanitizeStyles({
        color: "var(--ps-muted)",
        background: "var(--ps-surface-alt)",
        padding: "var(--ps-section-gap) 24px",
      }),
    ).toEqual({
      color: "var(--ps-muted)",
      background: "var(--ps-surface-alt)",
      padding: "var(--ps-section-gap) 24px",
    });
  });
});
