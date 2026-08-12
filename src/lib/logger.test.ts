import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/request-context", () => ({
  getRequestId: () => "req-test-1",
  bindRequestContext: async () => "req-test-1",
}));

import { logError } from "@/lib/logger";

describe("logError", () => {
  it("includes requestId from request context when present", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const id = logError("test.scope", new Error("boom"), { extra: true });
    expect(id).toMatch(/^[0-9a-f]{8}$/);
    expect(spy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(line.requestId).toBe("req-test-1");
    expect(line.scope).toBe("test.scope");
    expect(line.extra).toBe(true);
    spy.mockRestore();
  });
});
