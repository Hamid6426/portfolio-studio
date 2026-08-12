import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPageView } from "@/components/public-page-view";
import { canPreviewDrafts } from "@/lib/pages/draft-preview";
import { buildPageMetadata } from "@/lib/pages/page-metadata";
import {
  isPreviewRequested,
  PAGE_PREVIEW_PARAM,
} from "@/lib/pages/preview-path";
import { getLayoutBlockNodes } from "@/repositories/blocks";
import { getCachedPublishedPage, getDraftPage } from "@/repositories/pages";
import { getCachedSiteTheme } from "@/repositories/site-theme";

/**
 * No `dynamic` export: the root layout's startup gate reads `headers()`, which
 * already opts every route into dynamic rendering, so `force-dynamic` bought
 * nothing while disabling data caching. The page read itself is cached and
 * tagged instead — see `getCachedPublishedPage`.
 */

type RootPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** Published page, or the draft when a permitted user asks for a preview. */
async function resolveRootPage(searchParams: RootPageProps["searchParams"]) {
  const params = await searchParams;
  const wantsPreview = isPreviewRequested(params[PAGE_PREVIEW_PARAM]);

  if (wantsPreview && (await canPreviewDrafts())) {
    return { page: await getDraftPage(null), isPreview: true };
  }

  return { page: await getCachedPublishedPage(null), isPreview: false };
}

export async function generateMetadata({
  searchParams,
}: RootPageProps): Promise<Metadata> {
  const { page, isPreview } = await resolveRootPage(searchParams);

  if (!page) {
    return { title: "Home" };
  }

  return buildPageMetadata(page, { isPreview });
}

/** `/` — CMS landing page (`pages.slug` is null). */
export default async function RootPage({ searchParams }: RootPageProps) {
  const [{ page, isPreview }, theme] = await Promise.all([
    resolveRootPage(searchParams),
    getCachedSiteTheme(),
  ]);

  if (!page) {
    notFound();
  }

  let layoutChildren: import("@/db/schema").BlockNode[] = [];
  let layoutUnreadable = false;
  let layoutUnsupportedVersion: number | undefined;

  if (page.blockId) {
    const layout = await getLayoutBlockNodes(
      page.blockId,
      isPreview ? "draft" : "published",
    );
    if (layout.ok) {
      layoutChildren = layout.nodes;
    } else if (layout.reason === "unsupported-version") {
      layoutUnreadable = true;
      layoutUnsupportedVersion = layout.version;
    }
  }

  return (
    <PublicPageView
      page={page}
      layoutChildren={layoutChildren}
      isPreview={isPreview}
      layoutUnreadable={layoutUnreadable}
      layoutUnsupportedVersion={layoutUnsupportedVersion}
      themeId={theme.themeId}
      themeSettings={theme.themeSettings}
    />
  );
}
