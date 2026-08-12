/** Public URL prefix — files are served by `src/app/upload/[filename]/route.ts`. */
export const UPLOAD_URL_PREFIX = "/upload";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MiB

export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

export type AllowedImageMime = keyof typeof ALLOWED_IMAGE_TYPES;

export const ALLOWED_IMAGE_ACCEPT = Object.keys(ALLOWED_IMAGE_TYPES).join(",");
