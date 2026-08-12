import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/app-url";
import { listPublishedPagePaths } from "@/repositories/pages";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const pages = await listPublishedPagePaths();

  return pages.map(({ slug, updatedAt }) => ({
    url: slug ? `${base}/${slug}` : base,
    lastModified: updatedAt ?? undefined,
  }));
}
