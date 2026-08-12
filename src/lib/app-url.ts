import { env } from "@/config/env";

/** Canonical site origin for metadata, sitemap, and robots (no trailing slash). */
export function getAppUrl(): string {
  const raw = env.APP_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
