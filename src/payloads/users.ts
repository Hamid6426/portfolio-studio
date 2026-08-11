import { z } from "zod";

export const createUserPayloadSchema = z.object({
  name: z.string().trim().min(1, "Please enter a name."),
  email: z.email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Your password needs to be at least 8 characters."),
  role: z.string().trim().min(1, "Please choose a role."),
});

export type CreateUserPayload = z.infer<typeof createUserPayloadSchema>;

export const updateUserPayloadSchema = z.object({
  name: z.string().trim().min(1, "Please enter a name."),
  email: z.email("Please enter a valid email address."),
  role: z.string().trim().min(1, "Please choose a role."),
  password: z
    .string()
    .refine(
      (value) => value.length === 0 || value.length >= 8,
      "Your password needs to be at least 8 characters.",
    )
    .optional(),
});

export type UpdateUserPayload = z.infer<typeof updateUserPayloadSchema>;
