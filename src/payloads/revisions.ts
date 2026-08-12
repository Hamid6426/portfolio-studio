import { z } from "zod";

export const restoreRevisionPayloadSchema = z.object({
  expectedUpdatedAt: z.string().datetime({
    message: "expectedUpdatedAt is required for concurrent edits.",
  }),
});

export type RestoreRevisionPayload = z.infer<
  typeof restoreRevisionPayloadSchema
>;
