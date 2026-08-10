import { z } from "zod";

const schema = z.object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: z.string().min(32),
    NODE_ENV: z
        .enum(["local", "development", "staging", "production"])
        .default("local"),
});

export const env = schema.parse(process.env);
