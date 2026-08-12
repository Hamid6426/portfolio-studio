import { NextResponse } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/config/storage-keys";
import {
  clearAuthCookies,
  readCookieValue,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { refreshSession } from "@/repositories/auth";

function isAllowedRefreshNavigation(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  // Cross-site top-level GETs would rotate refresh tokens (SameSite=Lax).
  if (site === "cross-site") return false;

  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return false;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== url.origin) return false;
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Server bounce used by the dashboard layout when the access cookie is gone
 * but a refresh cookie still exists. Refreshes cookies, then redirects back.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const safeNext = safeRedirectPath(requestUrl.searchParams.get("next"));

  if (!isAllowedRefreshNavigation(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", safeNext);
    const result = NextResponse.redirect(loginUrl);
    clearAuthCookies(result);
    return result;
  }

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
