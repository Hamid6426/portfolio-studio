import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  ALLOWED_IMAGE_TYPES,
  UPLOAD_URL_PREFIX,
  type AllowedImageMime,
} from "@/lib/media/constants";

export {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_URL_PREFIX,
  type AllowedImageMime,
} from "@/lib/media/constants";

/** On-disk directory at the project root (gitignored contents). */
export const UPLOAD_DIR_NAME = "upload";

const STORED_NAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|webp|avif)$/i;

export function uploadRootDir(): string {
  return path.join(process.cwd(), UPLOAD_DIR_NAME);
}

export function absoluteUploadPath(storedName: string): string {
  if (!isSafeStoredName(storedName)) {
    throw new Error("Invalid stored filename.");
  }
  return path.join(uploadRootDir(), storedName);
}

export function publicUploadUrl(storedName: string): string {
  if (!isSafeStoredName(storedName)) {
    throw new Error("Invalid stored filename.");
  }
  return `${UPLOAD_URL_PREFIX}/${storedName}`;
}

export function isSafeStoredName(name: string): boolean {
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
    return false;
  }
  return STORED_NAME_RE.test(name);
}

export function isAllowedImageMime(value: string): value is AllowedImageMime {
  return value in ALLOWED_IMAGE_TYPES;
}

/**
 * Sniff common image magic bytes. Rejects SVG and other XML that could carry
 * script even if the Content-Type header claims otherwise.
 */
export function sniffImageMime(bytes: Uint8Array): AllowedImageMime | null {
  if (bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(
      bytes[8]!,
      bytes[9]!,
      bytes[10]!,
      bytes[11]!,
    );
    if (brand === "avif" || brand === "avis" || brand === "mif1") {
      return "image/avif";
    }
  }

  return null;
}

export type WrittenUpload = {
  storedName: string;
  mimeType: AllowedImageMime;
  sizeBytes: number;
  url: string;
};

export async function writeUploadFile(
  bytes: Uint8Array,
  mimeType: AllowedImageMime,
): Promise<WrittenUpload> {
  const ext = ALLOWED_IMAGE_TYPES[mimeType];
  const storedName = `${randomUUID()}.${ext}`;
  const dir = uploadRootDir();
  await mkdir(dir, { recursive: true });
  await writeFile(absoluteUploadPath(storedName), bytes);
  return {
    storedName,
    mimeType,
    sizeBytes: bytes.byteLength,
    url: publicUploadUrl(storedName),
  };
}

export async function removeUploadFile(storedName: string): Promise<void> {
  if (!isSafeStoredName(storedName)) return;
  try {
    await unlink(absoluteUploadPath(storedName));
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code !== "ENOENT") throw error;
  }
}

/** True when the asset URL is remote (UploadThing CDN) rather than `/upload/…`. */
export function isRemoteAssetUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
