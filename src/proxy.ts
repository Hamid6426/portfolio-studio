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
 * Per-request CSP.
 *
 * - `script-src` uses a nonce + `strict-dynamic` (no `'unsafe-inline'`). Next
 *   reads the nonce from the *request* CSP and stamps its own script tags.
 * - Public `style-src` is nonce-only; theme/block `<style>` tags pass the same
 *   nonce. Dashboard keeps `'unsafe-inline'` for editor chrome (style attrs).
 * - `'unsafe-eval'` only in development (React stack reconstruction).
 */
export function contentSecurityPolicy(
  pathname: string,
  nonce: string,
  options: { isDev?: boolean } = {},
): string {
  const isDashboard = pathname.startsWith("/dashboard");
  const isDev =
    options.isDev ?? process.env.NODE_ENV === "development";

  const scriptSrc = [
    "script-src",
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "'wasm-unsafe-eval'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

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
