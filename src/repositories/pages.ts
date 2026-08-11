import { asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { layoutsTable, pagesTable } from "@/db/schema";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import type { ListPagesResponse, PageSummary } from "@/responses/pages";

function toPageSummary(row: {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  layoutId: string | null;
  layoutName: string | null;
  createdAt: Date | null;
  publishedAt: Date | null;
}): PageSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    layoutId: row.layoutId,
    layoutName: row.layoutName,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
  };
}

export async function listPages(): Promise<ListPagesResponse> {
  try {
    const pages = await db
      .select({
        id: pagesTable.id,
        title: pagesTable.title,
        slug: pagesTable.slug,
        description: pagesTable.description,
        layoutId: pagesTable.layoutId,
        layoutName: layoutsTable.name,
        createdAt: pagesTable.createdAt,
        publishedAt: pagesTable.publishedAt,
      })
      .from(pagesTable)
      .leftJoin(layoutsTable, eq(pagesTable.layoutId, layoutsTable.id))
      .orderBy(asc(pagesTable.title));

    return {
      success: true,
      statusCode: 200,
      data: pages.map(toPageSummary),
    };
  } catch (error) {
    console.error("listPages failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading pages.",
    );
  }
}

/** Landing page when `slug` is null; otherwise match by slug. */
export async function getPublicPage(
  slug: string | null,
): Promise<PageSummary | null> {
  const rows = await db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      description: pagesTable.description,
      layoutId: pagesTable.layoutId,
      layoutName: layoutsTable.name,
      createdAt: pagesTable.createdAt,
      publishedAt: pagesTable.publishedAt,
    })
    .from(pagesTable)
    .leftJoin(layoutsTable, eq(pagesTable.layoutId, layoutsTable.id))
    .where(slug === null ? isNull(pagesTable.slug) : eq(pagesTable.slug, slug))
    .limit(1);

  const row = rows[0];
  return row ? toPageSummary(row) : null;
}
