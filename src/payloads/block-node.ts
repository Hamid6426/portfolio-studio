import { z } from "zod";

import type { BlockNode } from "@/db/schema.types";
import {
  normalizeResponsiveStyles,
  pruneResponsiveStyles,
  type ResponsiveStyles,
} from "@/lib/blocks/styles";

/**
 * Deepest nesting accepted in a block tree (a root node counts as depth 1).
 * Editors never come close; the bound keeps hostile or corrupt payloads from
 * driving unbounded recursion through validation and rendering.
 */
export const MAX_BLOCK_NODE_DEPTH = 32;

/**
 * Accept v2 responsive styles *or* legacy flat maps. Flat maps are wrapped
 * into `{ base }` so a paste/save never silently strips styles (see audit A2).
 */
const stylesSchema = z
  .unknown()
  .optional()
  .transform((raw): ResponsiveStyles | undefined => {
    if (raw == null) return undefined;
    const normalized = normalizeResponsiveStyles(raw);
    return pruneResponsiveStyles(normalized);
  });

/** One recursive editor node, shared by `pages.content` and `blocks.children`. */
export const blockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    props: z.record(z.string(), z.unknown()),
    styles: stylesSchema,
    children: z.array(blockNodeSchema).optional(),
  }),
);

/** Walked with an explicit stack so measuring depth can never overflow one. */
function exceedsMaxDepth(value: unknown): boolean {
  if (!Array.isArray(value)) return false;

  const stack: { node: unknown; depth: number }[] = value.map((node) => ({
    node,
    depth: 1,
  }));

  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) break;
    if (entry.depth > MAX_BLOCK_NODE_DEPTH) return true;
    if (!entry.node || typeof entry.node !== "object") continue;

    const children = (entry.node as { children?: unknown }).children;
    if (!Array.isArray(children)) continue;

    for (const child of children) {
      stack.push({ node: child, depth: entry.depth + 1 });
    }
  }

  return false;
}

/**
 * A whole block tree. The depth guard runs on the raw input and short-circuits
 * the pipe, so the recursive node schema only ever sees a bounded tree.
 */
export const blockNodeTreeSchema: z.ZodType<BlockNode[], unknown> = z
  .unknown()
  .superRefine((value, ctx) => {
    if (exceedsMaxDepth(value)) {
      ctx.addIssue({
        code: "custom",
        message: `Blocks can only be nested ${MAX_BLOCK_NODE_DEPTH} levels deep.`,
      });
    }
  })
  .pipe(z.array(blockNodeSchema));
