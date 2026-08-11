import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^\/+/, "").toLowerCase())
  .refine(
    (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    "Use lowercase letters, numbers, and hyphens (e.g. hero-section).",
  );

export const createBlockPayloadSchema = z.object({
  name: z.string().trim().min(1, "Please enter a name."),
  slug: slugSchema,
  description: z.string().trim().default(""),
  canBeLayout: z.boolean().default(false),
});

export type CreateBlockPayload = z.infer<typeof createBlockPayloadSchema>;

export const updateBlockPayloadSchema = createBlockPayloadSchema;

export type UpdateBlockPayload = z.infer<typeof updateBlockPayloadSchema>;
