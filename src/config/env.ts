import { z } from "zod";

const PLACEHOLDER_AUTH_SECRET =
  "change-me-to-a-random-string-of-at-least-32-chars";

const schema = z
  .object({
    DATABASE_URL: z
      .string({ error: "DATABASE_URL is required (Postgres connection string)." })
      .min(1, "DATABASE_URL is required (Postgres connection string)."),
    AUTH_SECRET: z
      .string({
        error:
          "AUTH_SECRET is required (≥32 characters). Generate with: openssl rand -base64 32",
      })
      .min(
        32,
        "AUTH_SECRET must be at least 32 characters. Generate with: openssl rand -base64 32",
      ),
    /** Canonical public site URL (metadata, sitemap). */
    APP_URL: z.string().url().optional(),
    /**
     * Browser axios base URL. Keep accessing `process.env.NEXT_PUBLIC_APP_URL`
     * as a literal in client bundles; this field only validates when present
     * on the server at boot.
     */
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
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
        code: "custom",
        message:
          "AUTH_SECRET must not be the .env.example placeholder in production. Generate one with: openssl rand -base64 32",
        path: ["AUTH_SECRET"],
      });
    }
  });

function formatEnvError(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "env";
    return `  - ${path}: ${issue.message}`;
  });
  return [
    "Invalid environment configuration. Check `.env.local` (see `.env.example`).",
    ...lines,
  ].join("\n");
}

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(formatEnvError(parsed.error));
}

export const env = parsed.data;
