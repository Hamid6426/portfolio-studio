import { asc } from "drizzle-orm";

import { db } from "@/db/client";
import { layoutsTable } from "@/db/schema";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import type { ListLayoutsResponse, LayoutSummary } from "@/responses/layouts";

function toLayoutSummary(layout: {
  id: string;
  name: string;
  slug: string;
  description: string;
  structure: { type: string }[] | null;
  createdAt: Date | null;
  publishedAt: Date | null;
}): LayoutSummary {
  const structure = layout.structure ?? [];
  return {
    id: layout.id,
    name: layout.name,
    slug: layout.slug,
    description: layout.description,
    blockCount: structure.length,
    structure,
    createdAt: layout.createdAt,
    publishedAt: layout.publishedAt,
  };
}

export async function listLayouts(): Promise<ListLayoutsResponse> {
  try {
    const layouts = await db
      .select({
        id: layoutsTable.id,
        name: layoutsTable.name,
        slug: layoutsTable.slug,
        description: layoutsTable.description,
        structure: layoutsTable.structure,
        createdAt: layoutsTable.createdAt,
        publishedAt: layoutsTable.publishedAt,
      })
      .from(layoutsTable)
      .orderBy(asc(layoutsTable.name));

    return {
      success: true,
      statusCode: 200,
      data: layouts.map(toLayoutSummary),
    };
  } catch (error) {
    console.error("listLayouts failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading layouts.",
    );
  }
}
