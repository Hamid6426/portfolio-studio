import { describe, expect, it } from "vitest";

import {
  hashPassword,
  needsRehash,
  verifyPassword,
} from "@/lib/password";

describe("password hashing", () => {
  it("round-trips a password", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(needsRehash(stored)).toBe(false);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("rejects malformed stored values", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt:foo")).toBe(false);
    expect(await verifyPassword("x", "scrypt:only-salt")).toBe(false);
  });

  it("still verifies legacy scrypt:salt:hash and marks for rehash", async () => {
    const { scryptSync, randomBytes } = await import("node:crypto");
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync("legacy-pass", salt, 64).toString("hex");
    const legacy = `scrypt:${salt}:${hash}`;
    expect(await verifyPassword("legacy-pass", legacy)).toBe(true);
    expect(needsRehash(legacy)).toBe(true);
  });
});
