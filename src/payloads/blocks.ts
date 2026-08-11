import { z } from "zod";

export const createBlockPayloadSchema = z.object({
  name: z.string().trim().min(1, "Please enter a name."),
  description: z.string().trim().default(""),
  canBeLayout: z.boolean().default(false),
});

export type CreateBlockPayload = z.infer<typeof createBlockPayloadSchema>;

export const updateBlockPayloadSchema = createBlockPayloadSchema;

export type UpdateBlockPayload = z.infer<typeof updateBlockPayloadSchema>;
