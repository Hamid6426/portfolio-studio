/**
 * Thin builders over the seven block types the page editor understands.
 *
 * Used by `scripts/sections.ts`; datasets never call these directly.
 *
 * Every node is produced from `BLOCK_DEFINITIONS` (the same source the editor
 * uses), so the stored shape matches what `createBlockNode()` would produce:
 * defaults first, per-call overrides on top, `children` only where the
 * definition allows it.
 *
 * Style keys are limited to the allowlist in `@/lib/block-sanitize` — anything
 * outside it is dropped silently at render time, so `styleGuard()` asserts at
 * build time instead of letting styling vanish on the public site.
 */
import { randomUUID } from "node:crypto";

import {
  BLOCK_DEFINITIONS,
  type BlockType,
} from "@/components/page-editor/block-registry";
import type { BlockNode } from "@/db/schema.types";
import { isAllowedStyleProperty } from "@/lib/block-sanitize";

type Styles = Record<string, string>;

function styleGuard(styles: Styles, where: string): Styles {
  for (const key of Object.keys(styles)) {
    if (!isAllowedStyleProperty(key)) {
      throw new Error(
        `Style property "${key}" (on ${where}) is not in the block-sanitize allowlist; it would be dropped at render time.`,
      );
    }
  }
  return styles;
}

function make(
  type: BlockType,
  props: Record<string, unknown> = {},
  styles: Styles = {},
  children?: BlockNode[],
): BlockNode {
  const def = BLOCK_DEFINITIONS.find((item) => item.type === type);
  if (!def) throw new Error(`Unknown block type: ${type}`);

  const flat = styleGuard({ ...def.defaultStyles, ...styles }, type);

  return {
    id: randomUUID(),
    type: def.type,
    props: { ...def.defaultProps, ...props },
    styles: Object.keys(flat).length > 0 ? { base: flat } : undefined,
    children: def.canHaveChildren ? (children ?? []) : undefined,
  };
}

export function section(children: BlockNode[], styles: Styles = {}): BlockNode {
  return make("section", {}, styles, children);
}

export function container(
  children: BlockNode[],
  styles: Styles = {},
): BlockNode {
  return make("container", {}, styles, children);
}

export function heading(
  text: string,
  level: 1 | 2 | 3 | 4 = 2,
  styles: Styles = {},
): BlockNode {
  return make("heading", { text, level }, styles);
}

export function text(value: string, styles: Styles = {}): BlockNode {
  return make("text", { text: value }, styles);
}

export function button(
  label: string,
  href: string,
  styles: Styles = {},
): BlockNode {
  return make("button", { text: label, href }, styles);
}

export function divider(styles: Styles = {}): BlockNode {
  return make("divider", {}, styles);
}

/*
 * No `image` builder: add images from the dashboard media library
 * (`/dashboard/media` or the image block picker) so `src` points at a real
 * `/upload/…` URL rather than a dead remote placeholder.
 */
