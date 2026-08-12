import { isAllowedStyleProperty, sanitizeStyleMap } from "@/lib/block-sanitize";

/**
 * Breakpoint / state slices for {@link ResponsiveStyles}.
 *
 * Cascade (later wins within the cascade, never across unrelated axes):
 * 1. `base` — always applied
 * 2. `sm` / `md` / `lg` — `@container` min-width overrides (640 / 768 / 1024)
 * 3. `hover` — `:hover` overrides (applies at every breakpoint)
 *
 * Container queries (not viewport media queries) so the editor device-width
 * toggle and the public full-width wrapper share one stylesheet.
 */
export const STYLE_SLICE_KEYS = ["base", "sm", "md", "lg", "hover"] as const;
export type StyleSliceKey = (typeof STYLE_SLICE_KEYS)[number];

export type StylePropertyMap = Record<string, string>;

export type ResponsiveStyles = {
  base?: StylePropertyMap;
  sm?: StylePropertyMap;
  md?: StylePropertyMap;
  lg?: StylePropertyMap;
  hover?: StylePropertyMap;
};

const CONTAINER_MIN: Record<"sm" | "md" | "lg", number> = {
  sm: 640,
  md: 768,
  lg: 1024,
};

/** True when `value` looks like a flat v1 property map (all string values). */
export function isFlatStyleMap(value: unknown): value is StylePropertyMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return true;
  // A responsive object always uses at least one known slice key with an object value.
  const hasSliceObject = STYLE_SLICE_KEYS.some(
    (key) =>
      key in record &&
      record[key] !== null &&
      typeof record[key] === "object" &&
      !Array.isArray(record[key]),
  );
  if (hasSliceObject) return false;
  return Object.values(record).every((entry) => typeof entry === "string");
}

export function isResponsiveStyles(value: unknown): value is ResponsiveStyles {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (isFlatStyleMap(value)) return false;
  const record = value as Record<string, unknown>;
  for (const [key, entry] of Object.entries(record)) {
    if (!(STYLE_SLICE_KEYS as readonly string[]).includes(key)) return false;
    if (entry == null) continue;
    if (typeof entry !== "object" || Array.isArray(entry)) return false;
    if (!Object.values(entry as Record<string, unknown>).every((v) => typeof v === "string")) {
      return false;
    }
  }
  return true;
}

/** Wrap a flat v1 map into `{ base }`. Empty / missing → `{ base: {} }`. */
export function wrapFlatStyles(
  styles: StylePropertyMap | null | undefined,
): ResponsiveStyles {
  if (!styles || Object.keys(styles).length === 0) return {};
  return { base: { ...styles } };
}

/**
 * Normalise any stored styles shape to {@link ResponsiveStyles}.
 * Flat maps (v1) become `{ base }`; already-responsive maps pass through.
 */
export function normalizeResponsiveStyles(raw: unknown): ResponsiveStyles {
  if (raw == null) return {};
  if (isFlatStyleMap(raw)) return wrapFlatStyles(raw);
  if (isResponsiveStyles(raw)) return raw;
  return {};
}

/** Stable CSS class for a block node (`ps-` + id with unsafe chars stripped). */
export function blockStyleClassName(nodeId: string): string {
  const safe = nodeId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `ps-${safe || "node"}`;
}

function declarationsCss(map: StylePropertyMap | undefined): string {
  if (!map) return "";
  const safe = sanitizeStyleMap(map);
  return Object.entries(safe)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${cssKey}:${value}`;
    })
    .join(";");
}

/**
 * Build a stylesheet for a whole tree. Empty when nothing has styles.
 * Safe to inject into a `<style>` tag after sanitise.
 */
export function buildTreeStylesheet(
  nodes: { id: string; styles?: ResponsiveStyles; children?: unknown[] }[],
): string {
  const chunks: string[] = [];

  function walk(
    list: { id: string; styles?: ResponsiveStyles; children?: unknown[] }[],
  ) {
    for (const node of list) {
      const styles = normalizeResponsiveStyles(node.styles);
      const cls = `.${blockStyleClassName(node.id)}`;

      const base = declarationsCss(styles.base);
      if (base) chunks.push(`${cls}{${base}}`);

      for (const bp of ["sm", "md", "lg"] as const) {
        const decls = declarationsCss(styles[bp]);
        if (!decls) continue;
        chunks.push(
          `@container (min-width:${CONTAINER_MIN[bp]}px){${cls}{${decls}}}`,
        );
      }

      const hover = declarationsCss(styles.hover);
      if (hover) chunks.push(`${cls}:hover{${hover}}`);

      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(
          node.children as {
            id: string;
            styles?: ResponsiveStyles;
            children?: unknown[];
          }[],
        );
      }
    }
  }

  walk(nodes);
  return chunks.join("");
}

/** Drop empty slices so storage stays compact. */
export function pruneResponsiveStyles(
  styles: ResponsiveStyles,
): ResponsiveStyles | undefined {
  const next: ResponsiveStyles = {};
  for (const key of STYLE_SLICE_KEYS) {
    const map = styles[key];
    if (!map) continue;
    const cleaned: StylePropertyMap = {};
    for (const [prop, value] of Object.entries(map)) {
      if (!isAllowedStyleProperty(prop)) continue;
      if (typeof value !== "string" || !value.trim()) continue;
      cleaned[prop] = value.trim();
    }
    if (Object.keys(cleaned).length > 0) next[key] = cleaned;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}
