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

function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

function createRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Block trees and themes emit `<style>` elements (not attributes). Public
 * routes harden `style-src` with a per-request nonce and set
 * `style-src-attr 'none'`. Dashboard keeps `'unsafe-inline'` for editor chrome.
 *
 * Script nonces stay deferred — see future-plans operator polish. React/Next
 * need `'unsafe-eval'` in development for stack reconstruction.
 */
function contentSecurityPolicy(pathname: string, nonce: string): string {
  const isDashboard = pathname.startsWith("/dashboard");
  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
      : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'";

  const styleSrc = isDashboard
    ? "style-src 'self' 'unsafe-inline'"
    : `style-src 'self' 'nonce-${nonce}'`;

  const directives = [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    // Embed blocks (YouTube, etc.) — https iframes only; see sanitizeEmbedUrl.
    "frame-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  if (!isDashboard) {
    directives.push("style-src-attr 'none'");
  }
  return directives.join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = createNonce();
  const requestId =
    request.headers.get("x-request-id")?.trim() || createRequestId();
  const csp = contentSecurityPolicy(pathname, nonce);

  if (pathname.startsWith("/dashboard") && !hasAuthCookies(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set("Content-Security-Policy", csp);
    redirectResponse.headers.set("x-request-id", requestId);
    return redirectResponse;
  }

  const requestHeaders = new Headers(request.headers);
  const pathWithSearch = `${pathname}${request.nextUrl.search}`;
  requestHeaders.set("x-pathname", pathWithSearch);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", requestId);
  // Next extracts the nonce from the request CSP for its own tags.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
