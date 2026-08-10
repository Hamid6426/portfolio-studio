import type { NextResponse } from "next/server";

import { env } from "@/config/env";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/config/storage-keys";
import {
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL_MS,
} from "@/lib/auth/constants";

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

function baseCookieOptions(maxAge: number): CookieOptions {
  const secure = env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
) {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    baseCookieOptions(ACCESS_TOKEN_TTL_SEC),
  );

  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    baseCookieOptions(Math.floor(REFRESH_TOKEN_TTL_MS / 1000)),
  );
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", baseCookieOptions(0));
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", baseCookieOptions(0));
}

export function readCookieValue(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;

  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index);
    if (key === name) {
      return decodeURIComponent(part.slice(index + 1));
    }
  }

  return undefined;
}
