import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/auth/safe-redirect";

describe("safeRedirectPath", () => {
  it("allows normal relative paths", () => {
    expect(safeRedirectPath("/dashboard/overview")).toBe("/dashboard/overview");
    expect(safeRedirectPath("/dashboard/pages?x=1")).toBe(
      "/dashboard/pages?x=1",
    );
    expect(safeRedirectPath("/dashboard/pages/edit?slug=about")).toBe(
      "/dashboard/pages/edit?slug=about",
    );
  });

  it("rejects open redirects", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard/overview");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard/overview");
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard/overview");
    expect(safeRedirectPath("")).toBe("/dashboard/overview");
    expect(safeRedirectPath(null)).toBe("/dashboard/overview");
  });

  it("rejects control characters that WHATWG URL parsers strip", () => {
    expect(safeRedirectPath("/\r\n/evil.com")).toBe("/dashboard/overview");
    expect(safeRedirectPath("/\t/evil.com")).toBe("/dashboard/overview");
    expect(safeRedirectPath("/\n/evil.com")).toBe("/dashboard/overview");
    expect(safeRedirectPath("/dashboard\u0000/overview")).toBe(
      "/dashboard/overview",
    );
  });

  it("rejects /api paths that would loop session routes", () => {
    expect(safeRedirectPath("/api/auth/session/refresh")).toBe(
      "/dashboard/overview",
    );
    expect(safeRedirectPath("/api/auth/session/clear")).toBe(
      "/dashboard/overview",
    );
    expect(safeRedirectPath("/api/pages")).toBe("/dashboard/overview");
  });
});
