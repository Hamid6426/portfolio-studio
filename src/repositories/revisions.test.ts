import { describe, expect, it } from "vitest";

import { shouldCreateRevision } from "@/repositories/revisions";

describe("shouldCreateRevision", () => {
  const now = Date.parse("2026-08-12T12:00:00.000Z");

  it("skips identical content", () => {
    expect(
      shouldCreateRevision({
        source: "manual",
        contentMatchesLatest: true,
        latestCreatedAt: new Date(now - 60_000),
        now,
      }),
    ).toBe(false);
  });

  it("always records manual / restore when content changed", () => {
    expect(
      shouldCreateRevision({
        source: "manual",
        contentMatchesLatest: false,
        latestCreatedAt: new Date(now - 1_000),
        now,
      }),
    ).toBe(true);
    expect(
      shouldCreateRevision({
        source: "restore",
        contentMatchesLatest: false,
        latestCreatedAt: new Date(now - 1_000),
        now,
      }),
    ).toBe(true);
  });

  it("throttles autosave within the interval", () => {
    expect(
      shouldCreateRevision({
        source: "autosave",
        contentMatchesLatest: false,
        latestCreatedAt: new Date(now - 60_000),
        now,
        autosaveIntervalMs: 5 * 60_000,
      }),
    ).toBe(false);
  });

  it("records autosave after the interval or with no prior revision", () => {
    expect(
      shouldCreateRevision({
        source: "autosave",
        contentMatchesLatest: false,
        latestCreatedAt: null,
        now,
      }),
    ).toBe(true);
    expect(
      shouldCreateRevision({
        source: "autosave",
        contentMatchesLatest: false,
        latestCreatedAt: new Date(now - 6 * 60_000),
        now,
        autosaveIntervalMs: 5 * 60_000,
      }),
    ).toBe(true);
  });
});
