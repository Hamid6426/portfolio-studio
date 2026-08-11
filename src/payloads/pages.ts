import { z } from "zod";

import { blockNodeTreeSchema } from "@/payloads/block-node";

const slugSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^\/+/, "").toLowerCase())
  .refine(
    (value) => value === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    "Use lowercase letters, numbers, and hyphens (e.g. about-me).",
  );

export const createPagePayloadSchema = z.object({
  title: z.string().trim().min(1, "Please enter a title."),
  slug: slugSchema,
  description: z.string().trim().default(""),
  content: blockNodeTreeSchema.default([]),
  blockId: z.string().trim().nullable().optional(),
});

export type CreatePagePayload = z.infer<typeof createPagePayloadSchema>;

/** Metadata and/or content — editor can PATCH content alone. */
export const updatePagePayloadSchema = z.object({
  title: z.string().trim().min(1, "Please enter a title.").optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().optional(),
  content: blockNodeTreeSchema.optional(),
  blockId: z.string().trim().nullable().optional(),
});

export type UpdatePagePayload = z.infer<typeof updatePagePayloadSchema>;
