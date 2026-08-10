import { NextResponse } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/config/storage-keys";
import {
  clearAuthCookies,
  readCookieValue,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { refreshSession } from "@/repositories/auth";

/**
 * Server bounce used by the dashboard layout when the access cookie is gone
 * but a refresh cookie still exists. Refreshes cookies, then redirects back.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = requestUrl.searchParams.get("next") || "/dashboard/overview";
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard/overview";

  const rawRefreshToken = readCookieValue(
    request.headers.get("cookie"),
    REFRESH_TOKEN_COOKIE,
  );

  const { tokens } = await refreshSession(rawRefreshToken);

  if (!tokens) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", safeNext);
    const result = NextResponse.redirect(loginUrl);
    clearAuthCookies(result);
    return result;
  }

  const result = NextResponse.redirect(new URL(safeNext, request.url));
  setAuthCookies(result, tokens);
  return result;
}
