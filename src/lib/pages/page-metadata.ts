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

  const ogImage = new URL("/og.png", `${getAppUrl()}/`).toString();

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
      images: [{ url: ogImage, width: 1536, height: 1024, alt: page.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description,
      images: [ogImage],
    },
  };
}
