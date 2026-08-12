import { NextResponse } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/config/storage-keys";
import {
  clearAuthCookies,
  readCookieValue,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { refreshSession } from "@/repositories/auth";

/**
 * Allow same-origin navigations and user-initiated top-level loads (`none`,
 * e.g. typed URL / bookmark). Reject `cross-site` so a foreign site cannot
 * rotate the refresh token via SameSite=Lax top-level GET.
 *
 * Do **not** reject on a cross-origin Referer — inbound links from email/Slack
 * with an expired access cookie must still be able to refresh.
 */
function isAllowedRefreshNavigation(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") return false;
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
    // Keep cookies — this is often a real user following an external link.
    // Clearing here forced a full logout (plan-3 regression).
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
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
