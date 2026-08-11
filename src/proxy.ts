import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/config/storage-keys";

function hasAuthCookies(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
      request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
  );
}

function hasAccessCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optimistic dashboard gate — full JWT checks happen in the dashboard layout.
  if (pathname.startsWith("/dashboard") && !hasAuthCookies(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in — skip the login page.
  if (pathname === "/login" && hasAccessCookie(request)) {
    return NextResponse.redirect(new URL("/dashboard/overview", request.url));
  }

  // Forward pathname on the *request* so Server Components can read it via
  // `headers()` (response headers are not visible there).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Run on app routes; skip static assets and image optimizer.
     * Keep API routes out — they handle their own 401/refresh.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
