import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPageView } from "@/components/public-page-view";
import { canPreviewDrafts } from "@/lib/pages/draft-preview";
import {
  isPreviewRequested,
  PAGE_PREVIEW_PARAM,
} from "@/lib/pages/preview-path";
import { getBlockById } from "@/repositories/blocks";
import { getCachedPublishedPage, getDraftPage } from "@/repositories/pages";

/**
 * No `dynamic` export and no `generateStaticParams`: the root layout's startup
 * gate reads `headers()`, which opts every route into dynamic rendering, so
 * these pages cannot be prerendered no matter what this segment declares.
 * `force-dynamic` additionally disabled data caching for nothing. The page read
 * is cached and tagged instead — see `getCachedPublishedPage`.
 */

type SlugPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** Published page, or the draft when a permitted user asks for a preview. */
async function resolveSlugPage({ params, searchParams }: SlugPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const wantsPreview = isPreviewRequested(query[PAGE_PREVIEW_PARAM]);

  if (wantsPreview && (await canPreviewDrafts())) {
    return { page: await getDraftPage(slug), isPreview: true };
  }

  return { page: await getCachedPublishedPage(slug), isPreview: false };
}

export async function generateMetadata(
  props: SlugPageProps,
): Promise<Metadata> {
  const { page, isPreview } = await resolveSlugPage(props);

  if (!page) {
    return { title: "Not Found" };
  }

  return {
    title: isPreview ? `Preview — ${page.title}` : page.title,
    ...(isPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

/** `/[slug]` — CMS page matched by `pages.slug`. */
export default async function SlugPage(props: SlugPageProps) {
  const { page, isPreview } = await resolveSlugPage(props);

  if (!page) {
    notFound();
  }

  const layout = page.blockId ? await getBlockById(page.blockId) : null;

  return (
    <PublicPageView
      page={page}
      layoutChildren={layout?.children ?? []}
      isPreview={isPreview}
    />
  );
}
