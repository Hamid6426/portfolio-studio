import type { ResponsiveStyles } from "@/lib/blocks/styles";

/** Nested HTML-like node stored inside a {@link BlockDocument}. */
export type BlockNode = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  /**
   * Responsive / state style slices (`base`, `sm`, `md`, `lg`, `hover`).
   * Flat `Record<string,string>` is legacy v1 and is wrapped into `{ base }`
   * on read via `migrateBlockDocument`.
   */
  styles?: ResponsiveStyles;
  children?: BlockNode[];
};

/**
 * Versioned block tree. Stored in `pages.content`, `blocks.children`, and
 * inside `published_snapshot.content`. Bare `BlockNode[]` is legacy (v0) and
 * is upgraded on read via `migrateBlockDocument`.
 */
export type BlockDocument = {
  version: number;
  nodes: BlockNode[];
};

/**
 * Frozen copy of everything the public renderer reads from a page, written
 * when the page is published. Keeping it separate from the live columns is
 * what makes the editor a true draft surface: saving edits touches only the
 * live columns, so the public site keeps serving this snapshot until someone
 * publishes again. `slug` is deliberately absent — it is the page's address,
 * not its content, so renaming it moves the live page immediately.
 */
export type PublishedPageSnapshot = {
  title: string;
  description: string;
  blockId: string | null;
  content: BlockDocument;
  /** Layout block tree frozen at publish time. */
  layoutChildren?: BlockDocument;
};

/**
 * Singleton site configuration overrides stored on `site_settings.theme_settings`.
 * Theme definitions live in code; this shape is the optional token overrides.
 */
export type SiteThemeSettings = {
  primaryColor?: string;
  radius?: string;
  sectionSpacing?: string;
  fontBody?: string;
  /** Selects the theme's light or dark token pair. */
  colorScheme?: "light" | "dark";
};
