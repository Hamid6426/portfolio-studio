import { z } from "zod";

import { blockNodeTreeSchema } from "@/payloads/block-node";

export const createBlockPayloadSchema = z.object({
  name: z.string().trim().min(1, "Please enter a name."),
  description: z.string().trim().default(""),
  canBeLayout: z.boolean().default(false),
  /** Omit on create for an empty tree; omit on update to keep the stored one. */
  children: blockNodeTreeSchema.optional(),
});

export type CreateBlockPayload = z.infer<typeof createBlockPayloadSchema>;

export const updateBlockPayloadSchema = createBlockPayloadSchema;

export type UpdateBlockPayload = z.infer<typeof updateBlockPayloadSchema>;
