/**
 * Validate same-origin relative redirect targets.
 *
 * Rejects protocol-relative (`//evil.com`), backslash tricks (`/\\evil.com`),
 * and anything that is not a path starting with a single `/`.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard/overview",
): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed.slice(1))) return fallback;
  return trimmed;
}
