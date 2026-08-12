import { randomUUID } from "node:crypto";

import { UTApi, UTFile } from "uploadthing/server";

import { env } from "@/config/env";
import {
  ALLOWED_IMAGE_TYPES,
  type AllowedImageMime,
} from "@/lib/media/constants";
import type { WrittenUpload } from "@/lib/media/storage";

let client: UTApi | null = null;

function getUtApi(): UTApi {
  if (!env.UPLOADTHING_TOKEN) {
    throw new Error("UPLOADTHING_TOKEN is not configured.");
  }
  if (!client) {
    client = new UTApi({ token: env.UPLOADTHING_TOKEN });
  }
  return client;
}

/**
 * Upload image bytes to UploadThing. `storedName` becomes the UT file key
 * (used later for deleteFiles). `url` is the public CDN URL.
 */
export async function writeUploadThingFile(
  bytes: Uint8Array,
  mimeType: AllowedImageMime,
): Promise<WrittenUpload> {
  const ext = ALLOWED_IMAGE_TYPES[mimeType];
  const name = `${randomUUID()}.${ext}`;
  // Copy into a plain ArrayBuffer-backed Uint8Array — UTFile/Blob reject
  // SharedArrayBuffer views from some runtimes.
  const copy = Uint8Array.from(bytes);
  const file = new UTFile([copy], name, { type: mimeType });

  const result = await getUtApi().uploadFiles(file);
  if (result.error || !result.data) {
    throw new Error(
      result.error?.message ?? "UploadThing rejected the upload.",
    );
  }

  const data = result.data as {
    key: string;
    url: string;
    ufsUrl?: string;
    size: number;
  };
  const url = data.ufsUrl ?? data.url;
  if (!url || !data.key) {
    throw new Error("UploadThing returned an incomplete file response.");
  }

  return {
    storedName: data.key,
    mimeType,
    sizeBytes: data.size ?? bytes.byteLength,
    url,
  };
}

export async function removeUploadThingFile(fileKey: string): Promise<void> {
  if (!fileKey.trim()) return;
  if (!env.UPLOADTHING_TOKEN) {
    // Catalogue soft-delete still proceeds; operator must delete CDN objects
    // manually if the token was removed (audit D).
    return;
  }
  try {
    await getUtApi().deleteFiles(fileKey);
  } catch (error) {
    // Soft-deleted catalogue rows should not fail the API if UT already
    // removed the object or the key is stale.
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);
    if (message.includes("not found") || message.includes("404")) return;
    throw error;
  }
}
