import { describe, expect, it } from "vitest";

import { contentSecurityPolicy } from "@/proxy";

describe("contentSecurityPolicy", () => {
  it("hardens script-src with nonce and strict-dynamic (no unsafe-inline)", () => {
    const csp = contentSecurityPolicy("/about", "abc123", { isDev: false });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("allows unsafe-eval only in development", () => {
    const csp = contentSecurityPolicy("/", "devnonce", { isDev: true });
    expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(csp).toContain("'nonce-devnonce'");
  });

  it("uses nonce style-src on public routes and unsafe-inline on dashboard", () => {
    const publicCsp = contentSecurityPolicy("/work", "n1", { isDev: false });
    expect(publicCsp).toContain("style-src 'self' 'nonce-n1'");
    expect(publicCsp).toContain("style-src-attr 'none'");

    const dashCsp = contentSecurityPolicy("/dashboard/pages", "n2", {
      isDev: false,
    });
    expect(dashCsp).toContain("style-src 'self' 'unsafe-inline'");
    expect(dashCsp).not.toContain("style-src-attr");
  });
});
