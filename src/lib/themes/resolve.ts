import { getTheme } from "@/lib/themes/registry";
import {
  THEME_CSS_VARS,
  type ThemeSettings,
  type ThemeTokens,
} from "@/lib/themes/types";

/**
 * Value fragments that must never appear in theme token / setting CSS.
 * Same threat model as block style values: no remote resources, no breakout.
 */
const FORBIDDEN = [
  "url(",
  "expression(",
  "javascript:",
  "@import",
  "/*",
  "*/",
  "\\",
  ";",
  "}",
  "<",
] as const;

const MAX_VALUE_LENGTH = 256;

/** True when a theme token or override is safe to emit into a `<style>` block. */
export function isSafeThemeCssValue(value: string): boolean {
  if (!value || value.length > MAX_VALUE_LENGTH) return false;
  const normalised = value.replace(/\s+/g, "").toLowerCase();
  if (!normalised) return false;
  return !FORBIDDEN.some((pattern) => normalised.includes(pattern));
}

/**
 * Accept hex, rgb(a), oklch, or a short named colour for primary overrides.
 * Rejects anything that fails {@link isSafeThemeCssValue}.
 */
export function isSafeColorValue(value: string): boolean {
  const trimmed = value.trim();
  if (!isSafeThemeCssValue(trimmed)) return false;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return true;
  if (/^(rgb|rgba|hsl|hsla|oklch|oklab)\(/i.test(trimmed)) return true;
  if (/^[a-z]{3,20}$/i.test(trimmed)) return true;
  return false;
}

export function isSafeLengthValue(value: string): boolean {
  const trimmed = value.trim();
  if (!isSafeThemeCssValue(trimmed)) return false;
  return /^[\d.]+\s*(px|rem|em|%)$/i.test(trimmed);
}

export function sanitizeThemeSettings(
  input: unknown,
): ThemeSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  const out: ThemeSettings = {};

  if (typeof raw.primaryColor === "string") {
    const value = raw.primaryColor.trim();
    if (isSafeColorValue(value)) out.primaryColor = value;
  }
  if (typeof raw.radius === "string") {
    const value = raw.radius.trim();
    if (isSafeLengthValue(value)) out.radius = value;
  }
  if (typeof raw.sectionSpacing === "string") {
    const value = raw.sectionSpacing.trim();
    if (isSafeLengthValue(value)) out.sectionSpacing = value;
  }
  if (typeof raw.fontBody === "string") {
    const value = raw.fontBody.trim();
    if (isSafeThemeCssValue(value) && value.length <= 200) {
      out.fontBody = value;
    }
  }

  return out;
}

/** Merge registry tokens with sanitised overrides. */
export function resolveThemeTokens(
  themeId: string | null | undefined,
  settings?: ThemeSettings | null,
): ThemeTokens {
  const theme = getTheme(themeId);
  const safe = sanitizeThemeSettings(settings ?? {});
  return {
    ...theme.tokens,
    ...(safe.primaryColor ? { primary: safe.primaryColor } : {}),
    ...(safe.radius ? { radius: safe.radius } : {}),
    ...(safe.sectionSpacing ? { sectionGap: safe.sectionSpacing } : {}),
    ...(safe.fontBody ? { fontBody: safe.fontBody } : {}),
  };
}

/** Build `--ps-*` custom property map for inline React style or CSS text. */
export function themeTokensToCssVars(
  tokens: ThemeTokens,
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(THEME_CSS_VARS) as [
    keyof ThemeTokens,
    string,
  ][]) {
    const value = tokens[key];
    if (isSafeThemeCssValue(value)) vars[cssVar] = value;
  }
  return vars;
}

/**
 * Stylesheet applied to `.ps-site` (public + editor canvas). Uses a `<style>`
 * element so public CSP can keep `style-src-attr 'none'`.
 */
export function buildThemeStylesheet(
  themeId: string | null | undefined,
  settings?: ThemeSettings | null,
): string {
  const theme = getTheme(themeId);
  const vars = themeTokensToCssVars(resolveThemeTokens(themeId, settings));
  const declarations = Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");

  return [
    `.ps-site{color-scheme:${theme.colorScheme};${declarations};`,
    `background:var(--ps-background);`,
    `color:var(--ps-foreground);`,
    `font-family:var(--ps-font-body);`,
    `min-height:100%;}`,
    `.ps-site h1,.ps-site h2,.ps-site h3,.ps-site h4{font-family:var(--ps-font-heading);}`,
    `.ps-site .ps-muted{color:var(--ps-muted);}`,
    `.ps-site .ps-subtle{color:var(--ps-subtle);}`,
  ].join("");
}
