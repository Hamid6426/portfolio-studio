import { z } from "zod";

export const loginPayloadSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Please enter a valid email address.")),
  password: z.string().min(1, "Please enter your password."),
});

export type LoginPayload = z.infer<typeof loginPayloadSchema>;

export const createAdminPayloadSchema = z
  .object({
    name: z.string().trim().min(1, "Please enter your name."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Please enter a valid email address.")),
    password: z
      .string()
      .min(8, "Your password needs to be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "The passwords don't match. Please try again.",
    path: ["confirmPassword"],
  });

export type CreateAdminPayload = z.infer<typeof createAdminPayloadSchema>;
