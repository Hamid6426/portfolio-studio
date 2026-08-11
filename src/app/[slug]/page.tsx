import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPageView } from "@/components/public-page-view";
import { getBlockById } from "@/repositories/blocks";
import { getPublicPage } from "@/repositories/pages";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicPage(slug);

  if (!page) {
    return { title: "Not Found" };
  }

  return { title: page.title };
}

/** `/[slug]` — CMS page matched by `pages.slug`. */
export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublicPage(slug);

  if (!page) {
    notFound();
  }

  const layout = page.blockId ? await getBlockById(page.blockId) : null;

  return (
    <PublicPageView
      page={page}
      layoutChildren={layout?.children ?? []}
    />
  );
}
