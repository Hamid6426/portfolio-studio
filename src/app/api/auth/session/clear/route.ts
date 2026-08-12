import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/lib/auth/cookies";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

/**
 * Clear stale auth cookies then send the browser to login.
 * Used instead of `cookies().delete()` in Server Components (sealed in Next 16).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = safeRedirectPath(requestUrl.searchParams.get("next"));
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", nextPath);

  // Cross-site GET must not be able to log the user out via <img src=...>.
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") {
    return NextResponse.redirect(loginUrl);
  }

  const result = NextResponse.redirect(loginUrl);
  clearAuthCookies(result);
  return result;
}
