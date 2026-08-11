import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/config/env";
import { ACCESS_TOKEN_TTL_SEC } from "@/lib/auth/constants";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function parseBase64urlJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function signAccessToken(input: {
  userId: string;
  email: string;
  role: string;
}): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      sub: input.userId,
      email: input.email,
      role: input.role,
      iat: now,
      exp: now + ACCESS_TOKEN_TTL_SEC,
    } satisfies AccessTokenPayload),
  );

  const signature = createHmac("sha256", env.AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", env.AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  const data = parseBase64urlJson<AccessTokenPayload>(payload);
  if (!data?.sub || !data.email || !data.role || !data.exp) return null;
  if (data.exp * 1000 <= Date.now()) return null;

  return data;
}

export function createRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
