import { z } from "zod";

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
  layoutId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type CreatePagePayload = z.infer<typeof createPagePayloadSchema>;

export const updatePagePayloadSchema = createPagePayloadSchema;

export type UpdatePagePayload = z.infer<typeof updatePagePayloadSchema>;
