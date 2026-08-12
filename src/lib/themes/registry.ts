import type { ThemeDefinition, ThemeTokens } from "@/lib/themes/types";

const SYSTEM_SANS =
  'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';
const SYSTEM_SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
const SYSTEM_MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
/** Prefer the app-loaded display face, then sans. */
const APP_HEADING = "var(--font-display), var(--font-sans), " + SYSTEM_SANS;
const APP_BODY = "var(--font-sans), " + SYSTEM_SANS;

/** Shared suggestion: applying a theme sets this layout as site default when it exists. */
const SUGGESTED_LAYOUT = "Site shell";

function pair(
  shared: Pick<ThemeTokens, "radius" | "fontBody" | "fontHeading" | "sectionGap">,
  light: Omit<ThemeTokens, keyof typeof shared>,
  dark: Omit<ThemeTokens, keyof typeof shared>,
): { light: ThemeTokens; dark: ThemeTokens } {
  return {
    light: { ...shared, ...light },
    dark: { ...shared, ...dark },
  };
}

/**
 * Built-in portfolio themes. Ids are stable — stored in `site_settings.theme_id`.
 * Do not rename ids without a data migration.
 */
export const THEME_REGISTRY: readonly ThemeDefinition[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Quiet surface, hairline borders, system type.",
    defaultColorScheme: "light",
    suggestedLayoutName: SUGGESTED_LAYOUT,
    tokens: pair(
      {
        radius: "0.25rem",
        fontBody: SYSTEM_SANS,
        fontHeading: SYSTEM_SANS,
        sectionGap: "56px",
      },
      {
        background: "oklch(0.99 0.005 95)",
        foreground: "oklch(0.22 0.01 260)",
        muted: "oklch(0.42 0.015 260)",
        subtle: "oklch(0.55 0.01 260)",
        border: "oklch(0.22 0.01 260 / 12%)",
        card: "oklch(0.97 0.005 95)",
        surfaceAlt: "oklch(0.965 0.008 95)",
        primary: "oklch(0.28 0.02 260)",
        primaryForeground: "oklch(0.99 0.005 95)",
      },
      {
        background: "oklch(0.18 0.01 260)",
        foreground: "oklch(0.96 0.005 95)",
        muted: "oklch(0.72 0.01 260)",
        subtle: "oklch(0.62 0.01 260)",
        border: "oklch(0.96 0.005 95 / 14%)",
        card: "oklch(0.22 0.01 260)",
        surfaceAlt: "oklch(0.2 0.01 260)",
        primary: "oklch(0.92 0.01 95)",
        primaryForeground: "oklch(0.2 0.01 260)",
      },
    ),
  },
  {
    id: "modern",
    name: "Modern",
    description: "Cool canvas with a clear primary accent.",
    defaultColorScheme: "light",
    suggestedLayoutName: SUGGESTED_LAYOUT,
    tokens: pair(
      {
        radius: "0.75rem",
        fontBody: APP_BODY,
        fontHeading: APP_HEADING,
        sectionGap: "64px",
      },
      {
        background: "oklch(0.985 0.01 250)",
        foreground: "oklch(0.2 0.03 260)",
        muted: "oklch(0.45 0.02 260)",
        subtle: "oklch(0.55 0.015 260)",
        border: "oklch(0.2 0.03 260 / 12%)",
        card: "oklch(1 0 0)",
        surfaceAlt: "oklch(0.96 0.015 250)",
        primary: "oklch(0.45 0.14 255)",
        primaryForeground: "oklch(0.99 0.01 250)",
      },
      {
        background: "oklch(0.17 0.03 260)",
        foreground: "oklch(0.96 0.01 250)",
        muted: "oklch(0.7 0.02 260)",
        subtle: "oklch(0.6 0.015 260)",
        border: "oklch(0.96 0.01 250 / 14%)",
        card: "oklch(0.22 0.03 260)",
        surfaceAlt: "oklch(0.2 0.03 260)",
        primary: "oklch(0.65 0.14 255)",
        primaryForeground: "oklch(0.17 0.03 260)",
      },
    ),
  },
  {
    id: "creative",
    name: "Creative",
    description: "Warm paper tone with a soft coral accent.",
    defaultColorScheme: "light",
    suggestedLayoutName: SUGGESTED_LAYOUT,
    tokens: pair(
      {
        radius: "1rem",
        fontBody: APP_BODY,
        fontHeading: SYSTEM_SERIF,
        sectionGap: "60px",
      },
      {
        background: "oklch(0.97 0.02 75)",
        foreground: "oklch(0.28 0.04 40)",
        muted: "oklch(0.45 0.03 40)",
        subtle: "oklch(0.55 0.025 40)",
        border: "oklch(0.28 0.04 40 / 14%)",
        card: "oklch(0.99 0.015 75)",
        surfaceAlt: "oklch(0.94 0.03 75)",
        primary: "oklch(0.55 0.14 35)",
        primaryForeground: "oklch(0.99 0.01 75)",
      },
      {
        background: "oklch(0.2 0.03 40)",
        foreground: "oklch(0.96 0.02 75)",
        muted: "oklch(0.72 0.03 40)",
        subtle: "oklch(0.62 0.025 40)",
        border: "oklch(0.96 0.02 75 / 14%)",
        card: "oklch(0.25 0.03 40)",
        surfaceAlt: "oklch(0.23 0.03 40)",
        primary: "oklch(0.7 0.12 35)",
        primaryForeground: "oklch(0.2 0.03 40)",
      },
    ),
  },
  {
    id: "professional",
    name: "Professional",
    description: "Navy-leaning theme for résumé-style sites.",
    defaultColorScheme: "light",
    suggestedLayoutName: SUGGESTED_LAYOUT,
    tokens: pair(
      {
        radius: "0.375rem",
        fontBody: APP_BODY,
        fontHeading: APP_HEADING,
        sectionGap: "56px",
      },
      {
        background: "oklch(0.98 0.008 250)",
        foreground: "oklch(0.25 0.04 255)",
        muted: "oklch(0.42 0.03 255)",
        subtle: "oklch(0.52 0.02 255)",
        border: "oklch(0.25 0.04 255 / 14%)",
        card: "oklch(1 0 0)",
        surfaceAlt: "oklch(0.95 0.015 250)",
        primary: "oklch(0.38 0.08 255)",
        primaryForeground: "oklch(0.98 0.008 250)",
      },
      {
        background: "oklch(0.18 0.03 255)",
        foreground: "oklch(0.96 0.01 250)",
        muted: "oklch(0.7 0.02 255)",
        subtle: "oklch(0.6 0.02 255)",
        border: "oklch(0.96 0.01 250 / 14%)",
        card: "oklch(0.23 0.03 255)",
        surfaceAlt: "oklch(0.21 0.03 255)",
        primary: "oklch(0.72 0.08 255)",
        primaryForeground: "oklch(0.18 0.03 255)",
      },
    ),
  },
  {
    id: "developer",
    name: "Developer",
    description: "Charcoal surface — matches the original seed palette.",
    defaultColorScheme: "dark",
    suggestedLayoutName: SUGGESTED_LAYOUT,
    tokens: pair(
      {
        radius: "0.625rem",
        fontBody: APP_BODY,
        fontHeading: APP_HEADING,
        sectionGap: "56px",
      },
      {
        background: "oklch(0.98 0 0)",
        foreground: "oklch(0.2 0 0)",
        muted: "oklch(0.45 0 0)",
        subtle: "oklch(0.55 0 0)",
        border: "oklch(0.2 0 0 / 12%)",
        card: "oklch(1 0 0)",
        surfaceAlt: "oklch(0.96 0 0)",
        primary: "oklch(0.25 0 0)",
        primaryForeground: "oklch(0.98 0 0)",
      },
      {
        background: "oklch(0.145 0 0)",
        foreground: "oklch(0.985 0 0)",
        muted: "rgba(255,255,255,0.72)",
        subtle: "rgba(255,255,255,0.55)",
        border: "rgba(255,255,255,0.12)",
        card: "rgba(255,255,255,0.04)",
        surfaceAlt: "rgba(255,255,255,0.03)",
        primary: "oklch(0.922 0 0)",
        primaryForeground: "oklch(0.205 0 0)",
      },
    ),
  },
] as const;

export const DEFAULT_THEME_ID = "developer";

const byId = new Map(THEME_REGISTRY.map((theme) => [theme.id, theme]));

export function listThemes(): readonly ThemeDefinition[] {
  return THEME_REGISTRY;
}

export function getTheme(id: string | null | undefined): ThemeDefinition {
  if (id && byId.has(id)) return byId.get(id)!;
  return byId.get(DEFAULT_THEME_ID)!;
}

export function isThemeId(id: string): boolean {
  return byId.has(id);
}

/** Font stack presets offered in the themes UI (values must match registry usage). */
export const FONT_PRESETS = [
  { id: "app", label: "App (Inter / Syne)", value: APP_BODY },
  { id: "system", label: "System sans", value: SYSTEM_SANS },
  { id: "serif", label: "System serif", value: SYSTEM_SERIF },
  { id: "mono", label: "System mono", value: SYSTEM_MONO },
] as const;
