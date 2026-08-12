/**
 * Next.js data-cache tags for public page reads.
 *
 * This project does not enable `cacheComponents`, so `use cache` / `cacheTag`
 * are unavailable and the previous caching model applies: `unstable_cache`
 * for the reads, `revalidateTag(tag, "max")` for on-demand invalidation.
 * See `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`.
 */

/** Invalidated whenever any page's published state changes. */
export const PAGES_CACHE_TAG = "pages";

/** Sentinel for the landing page, whose slug is `null`. */
const HOME_SLUG_TAG = "__home__";

/** Per-page tag so publishing one page does not invalidate the whole site. */
export function pageCacheTag(slug: string | null): string {
  return `page:${slug ?? HOME_SLUG_TAG}`;
}

/** Per-layout-block tag for published `published_children` reads. */
export function blockCacheTag(blockId: string): string {
  return `block:${blockId}`;
}
