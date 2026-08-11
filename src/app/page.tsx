import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPageView } from "@/components/public-page-view";
import { getBlockById } from "@/repositories/blocks";
import { getPublicPage } from "@/repositories/pages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublicPage(null);
  if (!page) {
    return { title: "Home" };
  }
  return { title: page.title };
}

/** `/` — CMS landing page (`pages.slug` is null). */
export default async function RootPage() {
  const page = await getPublicPage(null);

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
