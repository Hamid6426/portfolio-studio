/**
 * Portfolio theme model.
 *
 * Themes are code-defined (see `registry.ts`). The live site stores only the
 * active `themeId` plus optional overrides in `site_settings`. Tokens become
 * CSS custom properties on `.ps-site` via a generated `<style>` block — not
 * inline style attributes — so public CSP can keep `style-src-attr 'none'`.
 *
 * Hand-authored block `.ps-*` rules win when they set concrete colors; content
 * that uses `var(--ps-…)` follows the active theme.
 */

export type ThemeTokens = {
  background: string;
  foreground: string;
  muted: string;
  subtle: string;
  border: string;
  card: string;
  surfaceAlt: string;
  primary: string;
  primaryForeground: string;
  radius: string;
  fontBody: string;
  fontHeading: string;
  sectionGap: string;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  description: string;
  colorScheme: "light" | "dark";
  tokens: ThemeTokens;
};

/** Optional per-site overrides applied on top of the selected theme's tokens. */
export type ThemeSettings = {
  primaryColor?: string;
  radius?: string;
  sectionSpacing?: string;
  fontBody?: string;
};

/** CSS custom property names emitted for `.ps-site`. */
export const THEME_CSS_VARS = {
  background: "--ps-background",
  foreground: "--ps-foreground",
  muted: "--ps-muted",
  subtle: "--ps-subtle",
  border: "--ps-border",
  card: "--ps-card",
  surfaceAlt: "--ps-surface-alt",
  primary: "--ps-primary",
  primaryForeground: "--ps-primary-foreground",
  radius: "--ps-radius",
  fontBody: "--ps-font-body",
  fontHeading: "--ps-font-heading",
  sectionGap: "--ps-section-gap",
} as const satisfies Record<keyof ThemeTokens, `--ps-${string}`>;
