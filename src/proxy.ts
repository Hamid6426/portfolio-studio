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

/**
 * Block trees no longer use inline style *attributes* on public pages; they
 * emit a `<style>` element. Public routes set `style-src-attr 'none'`. The
 * dashboard keeps attribute styles for editor chrome (swatches, Base UI).
 */
function contentSecurityPolicy(pathname: string): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  if (!pathname.startsWith("/dashboard")) {
    directives.push("style-src-attr 'none'");
  }
  return directives.join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasAuthCookies(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set(
      "Content-Security-Policy",
      contentSecurityPolicy(pathname),
    );
    return redirectResponse;
  }

  const requestHeaders = new Headers(request.headers);
  const pathWithSearch = `${pathname}${request.nextUrl.search}`;
  requestHeaders.set("x-pathname", pathWithSearch);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(
    "Content-Security-Policy",
    contentSecurityPolicy(pathname),
  );
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
