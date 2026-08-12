import type { Metadata } from "next";

import { getAppUrl } from "@/lib/app-url";

type PageMetaFields = {
  title: string;
  description: string;
  slug: string | null;
};

/** Public path for a CMS page (`/` when `slug` is null). */
export function pagePublicUrl(slug: string | null): string {
  const path = slug ? `/${slug}` : "/";
  return new URL(path, `${getAppUrl()}/`).toString();
}

/** Shared metadata for `/` and `/[slug]` from stored page fields. */
export function buildPageMetadata(
  page: PageMetaFields,
  options: { isPreview?: boolean } = {},
): Metadata {
  const isPreview = options.isPreview ?? false;
  const title = isPreview ? `Preview — ${page.title}` : page.title;
  const description = page.description.trim() || undefined;
  const url = pagePublicUrl(page.slug);

  return {
    title,
    description,
    ...(isPreview ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description,
      url,
      type: "website",
      // Operators can drop a branded `public/og.png` — until then omit images
      // so crawlers do not fetch a 404.
    },
    twitter: {
      card: "summary",
      title: page.title,
      description,
    },
  };
}
