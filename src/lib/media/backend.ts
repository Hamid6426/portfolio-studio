import { env } from "@/config/env";

/**
 * Media backend selection.
 *
 * - Default: local `upload/` on disk (self-host with a persistent volume).
 * - When `UPLOADTHING_TOKEN` is set: UploadThing cloud storage via UTApi,
 *   still behind `/api/assets` (same catalogue table and dashboard UI).
 */
export function isUploadThingEnabled(): boolean {
  return Boolean(env.UPLOADTHING_TOKEN);
}

export function mediaBackendLabel(): "uploadthing" | "local" {
  return isUploadThingEnabled() ? "uploadthing" : "local";
}
