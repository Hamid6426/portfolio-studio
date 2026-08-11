/**
 * Draft preview URLs for the public site.
 *
 * A preview renders the *live* (draft) page row instead of the published
 * snapshot, and is only served to a signed-in user who can access
 * `/dashboard/pages`. See `canPreviewDrafts` in `@/lib/pages/draft-preview`.
 *
 * Shape: `/?preview=1` for the landing page, `/<slug>?preview=1` otherwise.
 */

export const PAGE_PREVIEW_PARAM = "preview";

/** Public preview URL: landing page is `/?preview=1`, others `/about?preview=1`. */
export function pagePreviewPath(slug: string | null): string {
  const base = slug ? `/${slug}` : "/";
  return `${base}?${PAGE_PREVIEW_PARAM}=1`;
}

/** Live public URL for a published page. */
export function pagePublicPath(slug: string | null): string {
  return slug ? `/${slug}` : "/";
}

/** True when a public route's `searchParams` ask for the draft. */
export function isPreviewRequested(
  value: string | string[] | undefined,
): boolean {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === undefined) return false;
  return first !== "0" && first !== "false";
}
