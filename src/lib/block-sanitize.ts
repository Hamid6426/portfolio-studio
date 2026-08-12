import type { CSSProperties } from "react";

/**
 * Sanitisers for stored block content (`blocks`/`pages` jsonb).
 *
 * Block trees are authored in the dashboard but rendered verbatim to every
 * public visitor, so the stored `styles` map and URL-bearing props are treated
 * as untrusted input at render time.
 */

/**
 * CSS properties the page editor can actually produce.
 *
 * Derived from `StylePanel` (src/components/page-editor/style-panel.tsx) plus
 * the `defaultStyles` declared in `BLOCK_DEFINITIONS`. Anything outside this
 * list is dropped silently.
 */
const ALLOWED_STYLE_PROPERTIES = [
  // Layout (StylePanel > Layout)
  "width",
  "height",
  "maxWidth",
  "display",
  "flexDirection",
  "flexWrap",
  "flex",
  "minWidth",
  "justifyContent",
  "alignItems",
  "gap",
  "gridTemplateColumns",
  "aspectRatio",
  // Spacing (StylePanel > Spacing)
  "padding",
  "margin",
  // Typography (StylePanel > Typography)
  "fontSize",
  "fontWeight",
  "textAlign",
  "color",
  "lineHeight",
  "textDecoration",
  // Appearance (StylePanel > Appearance)
  "background",
  "backgroundColor",
  "borderRadius",
  "overflow",
  // Block defaults (divider)
  "border",
  "borderTop",
] as const satisfies readonly (keyof CSSProperties)[];

export type AllowedStyleProperty = (typeof ALLOWED_STYLE_PROPERTIES)[number];

const ALLOWED_STYLE_PROPERTY_SET: ReadonlySet<string> = new Set(
  ALLOWED_STYLE_PROPERTIES,
);

/**
 * Value fragments that can pull in remote resources, execute script, or break
 * out of a single declaration. Matched against a whitespace-stripped,
 * lowercased copy of the value so `url ( … )` and `java\nscript:` are caught.
 */
const FORBIDDEN_STYLE_VALUE_PATTERNS = [
  "url(",
  "expression(",
  "javascript:",
  "@import",
  "/*",
  "*/",
  "\\", // CSS escapes can spell out any of the above
  ";",
  "}",
  "<",
] as const;

/** Generous upper bound; nothing the editor emits comes close. */
const MAX_STYLE_VALUE_LENGTH = 256;

function isSafeStyleValue(value: string): boolean {
  if (!value || value.length > MAX_STYLE_VALUE_LENGTH) return false;
  // Strip all whitespace (incl. newlines/tabs) so obfuscated values normalise.
  const normalised = value.replace(/\s+/g, "").toLowerCase();
  if (!normalised) return false;
  return !FORBIDDEN_STYLE_VALUE_PATTERNS.some((pattern) =>
    normalised.includes(pattern),
  );
}

export function isAllowedStyleProperty(
  key: string,
): key is AllowedStyleProperty {
  return ALLOWED_STYLE_PROPERTY_SET.has(key);
}

/**
 * Build a sanitized property map from stored styles, keeping only allowlisted
 * properties with safe values. Unknown keys and unsafe values are dropped
 * silently so a bad entry degrades one declaration, not the page.
 */
export function sanitizeStyleMap(
  styles?: Record<string, string> | null,
): Partial<Record<AllowedStyleProperty, string>> {
  if (!styles) return {};

  const safe: Partial<Record<AllowedStyleProperty, string>> = {};

  for (const [key, rawValue] of Object.entries(styles)) {
    if (!isAllowedStyleProperty(key)) continue;
    if (typeof rawValue !== "string") continue;
    const value = rawValue.trim();
    if (!isSafeStyleValue(value)) continue;
    safe[key] = value;
  }

  return safe;
}

/**
 * @deprecated Prefer {@link sanitizeStyleMap} + generated classes. Kept for
 * the few editor UI affordances that still need a React style object.
 */
export function sanitizeStyles(
  styles?: Record<string, string> | null,
): CSSProperties {
  return sanitizeStyleMap(styles) as CSSProperties;
}

const ALLOWED_URL_PROTOCOLS: ReadonlySet<string> = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
]);

/**
 * Control characters (and stray whitespace) that browsers strip from URLs
 * before resolving them, which would otherwise hide `java\tscript:`.
 */
const URL_STRIPPED_CHARS = /[\u0000-\u0020\u007F]/g;

/**
 * Permit only `http:`, `https:`, `mailto:`, `tel:`, root-relative (`/…`) and
 * same-document (`#…`) URLs. Anything else (notably `javascript:`, `data:`,
 * `vbscript:` and protocol-relative `//host`) yields `fallback`.
 */
export function sanitizeUrl(value: unknown, fallback = "#"): string {
  if (typeof value !== "string") return fallback;

  // Scheme detection runs on a stripped copy; the original value is returned
  // verbatim so legitimate URLs keep any encoded characters they carry.
  const probe = value.replace(URL_STRIPPED_CHARS, "");
  if (!probe) return fallback;

  // Same-document anchor.
  if (probe.startsWith("#")) return value.trim();

  // Root-relative, but not protocol-relative (`//evil.example`).
  if (probe.startsWith("/")) {
    return probe.startsWith("//") ? fallback : value.trim();
  }

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(probe);
  if (!scheme) return fallback;

  return ALLOWED_URL_PROTOCOLS.has(`${scheme[1]!.toLowerCase()}:`)
    ? value.trim()
    : fallback;
}

/** True for absolute `http(s)` URLs, which should carry `rel="noopener noreferrer"`. */
export function isExternalUrl(url: string): boolean {
  return /^https?:/i.test(url.trim());
}

/**
 * iframe `src` for embed blocks — https only (no mailto/tel/hash/root-relative).
 * Empty / unsafe values yield `""` so the renderer can omit the iframe.
 */
export function sanitizeEmbedUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const allowed = sanitizeUrl(trimmed, "");
  return /^https:\/\//i.test(allowed) ? allowed : "";
}
