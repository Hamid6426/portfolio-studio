/**
 * Validate same-origin relative redirect targets after login / session refresh.
 *
 * Rejects protocol-relative URLs, backslash tricks, control characters (WHATWG
 * URL parsers strip CR/LF/TAB before parsing, which turns `/%0d%0a/evil.com`
 * into an open redirect), absolute URLs, and `/api/*` loops that would burn
 * refresh tokens.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard/overview",
): string {
  if (!value) return fallback;

  // Do not trim first — leading whitespace/control chars are an attack surface.
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed.slice(1))) return fallback;

  // Durable check: relative resolution must stay on the dummy origin.
  try {
    const resolved = new URL(trimmed, "http://x.invalid");
    if (resolved.origin !== "http://x.invalid") return fallback;
  } catch {
    return fallback;
  }

  // Refresh/clear bouncing to another mutating auth GET burns tokens / loops.
  const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? trimmed;
  if (pathOnly === "/api" || pathOnly.startsWith("/api/")) return fallback;

  return trimmed;
}
