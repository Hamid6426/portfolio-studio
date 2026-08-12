import { z } from "zod";

const PLACEHOLDER_AUTH_SECRET =
  "change-me-to-a-random-string-of-at-least-32-chars";

const schema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: z.string().min(32),
    /** Canonical public site URL (metadata, sitemap). Client axios uses NEXT_PUBLIC_APP_URL. */
    APP_URL: z.string().url().optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  })
  .superRefine((data, ctx) => {
    if (
      data.NODE_ENV === "production" &&
      data.AUTH_SECRET === PLACEHOLDER_AUTH_SECRET
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "AUTH_SECRET must not be the .env.example placeholder in production. Generate one with: openssl rand -base64 32",
        path: ["AUTH_SECRET"],
      });
    }
  });

export const env = schema.parse(process.env);

export { PLACEHOLDER_AUTH_SECRET };
