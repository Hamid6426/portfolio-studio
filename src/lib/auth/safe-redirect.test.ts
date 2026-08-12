import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/auth/safe-redirect";

describe("safeRedirectPath", () => {
  it("allows normal relative paths", () => {
    expect(safeRedirectPath("/dashboard/overview")).toBe("/dashboard/overview");
    expect(safeRedirectPath("/dashboard/pages?x=1")).toBe("/dashboard/pages?x=1");
  });

  it("rejects open redirects", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard/overview");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard/overview");
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard/overview");
    expect(safeRedirectPath("")).toBe("/dashboard/overview");
  });
});
