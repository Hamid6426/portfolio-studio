import { describe, expect, it } from "vitest";

import {
  signAccessToken,
  verifyAccessToken,
} from "@/lib/auth/tokens";

describe("access tokens", () => {
  it("round-trips a signed token", () => {
    const token = signAccessToken({
      userId: "user-1",
      email: "a@example.com",
      role: "admin",
    });
    const payload = verifyAccessToken(token);
    expect(payload?.sub).toBe("user-1");
    expect(payload?.email).toBe("a@example.com");
    expect(payload?.role).toBe("admin");
  });

  it("rejects a tampered signature", () => {
    const token = signAccessToken({
      userId: "user-1",
      email: "a@example.com",
      role: "admin",
    });
    const [header, payload, signature] = token.split(".");
    const flipped =
      signature!.endsWith("a") ? `${signature!.slice(0, -1)}b` : `${signature}a`;
    expect(verifyAccessToken(`${header}.${payload}.${flipped}`)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = signAccessToken({
      userId: "user-1",
      email: "a@example.com",
      role: "admin",
    });
    const [header, , signature] = token.split(".");
    const evil = Buffer.from(
      JSON.stringify({
        sub: "user-1",
        email: "a@example.com",
        role: "admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    // Different payload bytes → signature mismatch
    expect(verifyAccessToken(`${header}.${evil}.${signature}`)).toBeNull();
  });

  it("rejects alg=none style header swap", () => {
    const token = signAccessToken({
      userId: "user-1",
      email: "a@example.com",
      role: "admin",
    });
    const [, payload, signature] = token.split(".");
    const noneHeader = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" }),
    ).toString("base64url");
    expect(verifyAccessToken(`${noneHeader}.${payload}.${signature}`)).toBeNull();
    expect(verifyAccessToken(`${noneHeader}.${payload}.`)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const { createHmac } = await import("node:crypto");
    const { env } = await import("@/config/env");
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        sub: "user-1",
        email: "a@example.com",
        role: "admin",
        iat: 1,
        exp: 2,
      }),
    ).toString("base64url");
    const signature = createHmac("sha256", env.AUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");
    expect(verifyAccessToken(`${header}.${payload}.${signature}`)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyAccessToken("")).toBeNull();
    expect(verifyAccessToken("a.b")).toBeNull();
    expect(verifyAccessToken("not-a-jwt")).toBeNull();
  });
});
