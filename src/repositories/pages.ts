import { and, asc, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/db/client";
import { blocksTable, pagesTable } from "@/db/schema";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import type {
  CreatePagePayload,
  UpdatePagePayload,
} from "@/payloads/pages";
import {
  createPagePayloadSchema,
  updatePagePayloadSchema,
} from "@/payloads/pages";
import type {
  ListPagesResponse,
  PageResponse,
  PageSummary,
} from "@/responses/pages";

/** Reserved first path segments that must not collide with app routes. */
const RESERVED_SLUGS = new Set([
  "home",
  "login",
  "setup",
  "setup-guide",
  "dashboard",
  "api",
  "error",
]);

function toPageSummary(row: {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  blockId: string | null;
  blockName: string | null;
  createdAt: Date | null;
  publishedAt: Date | null;
}): PageSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    blockId: row.blockId,
    blockName: row.blockName,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
  };
}

function firstIssueField<T extends string>(
  path: PropertyKey | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((value) => value === path);
}

function normalizeSlug(slug: string): string | null {
  const trimmed = slug.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function loadPageSummary(id: string): Promise<PageSummary | null> {
  const rows = await db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      description: pagesTable.description,
      blockId: pagesTable.blockId,
      blockName: blocksTable.name,
      createdAt: pagesTable.createdAt,
      publishedAt: pagesTable.publishedAt,
    })
    .from(pagesTable)
    .leftJoin(blocksTable, eq(pagesTable.blockId, blocksTable.id))
    .where(eq(pagesTable.id, id))
    .limit(1);

  const row = rows[0];
  return row ? toPageSummary(row) : null;
}

async function assertSlugAvailable(
  slug: string | null,
  excludeId?: string,
): Promise<PageResponse | null> {
  if (slug !== null && RESERVED_SLUGS.has(slug)) {
    return {
      success: false,
      statusCode: 400,
      field: "slug",
      message: `"${slug}" is reserved. Choose a different slug.`,
    };
  }

  if (slug === null) {
    const existingHome = await db.query.pagesTable.findFirst({
      where: excludeId
        ? and(isNull(pagesTable.slug), ne(pagesTable.id, excludeId))
        : isNull(pagesTable.slug),
      columns: { id: true },
    });

    if (existingHome) {
      return {
        success: false,
        statusCode: 409,
        field: "slug",
        message:
          "A home page already exists. Leave slug empty only for the landing page.",
      };
    }

    return null;
  }

  const existing = await db.query.pagesTable.findFirst({
    where: excludeId
      ? and(eq(pagesTable.slug, slug), ne(pagesTable.id, excludeId))
      : eq(pagesTable.slug, slug),
    columns: { id: true },
  });

  if (existing) {
    return {
      success: false,
      statusCode: 409,
      field: "slug",
      message: "A page with that slug already exists.",
    };
  }

  return null;
}

async function assertLayoutBlock(
  blockId: string | null,
): Promise<PageResponse | null> {
  if (!blockId) return null;

  const block = await db.query.blocksTable.findFirst({
    where: eq(blocksTable.id, blockId),
    columns: { id: true, canBeLayout: true },
  });

  if (!block) {
    return {
      success: false,
      statusCode: 400,
      field: "blockId",
      message: "Please choose a valid layout block.",
    };
  }

  if (!block.canBeLayout) {
    return {
      success: false,
      statusCode: 400,
      field: "blockId",
      message: "That block is not marked as a layout block.",
    };
  }

  return null;
}

export async function listPages(): Promise<ListPagesResponse> {
  try {
    const pages = await db
      .select({
        id: pagesTable.id,
        title: pagesTable.title,
        slug: pagesTable.slug,
        description: pagesTable.description,
        blockId: pagesTable.blockId,
        blockName: blocksTable.name,
        createdAt: pagesTable.createdAt,
        publishedAt: pagesTable.publishedAt,
      })
      .from(pagesTable)
      .leftJoin(blocksTable, eq(pagesTable.blockId, blocksTable.id))
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
      blockId: pagesTable.blockId,
      blockName: blocksTable.name,
      createdAt: pagesTable.createdAt,
      publishedAt: pagesTable.publishedAt,
    })
    .from(pagesTable)
    .leftJoin(blocksTable, eq(pagesTable.blockId, blocksTable.id))
    .where(slug === null ? isNull(pagesTable.slug) : eq(pagesTable.slug, slug))
    .limit(1);

  const row = rows[0];
  return row ? toPageSummary(row) : null;
}

export async function createPage(
  payload: CreatePagePayload,
): Promise<PageResponse> {
  const parsed = createPagePayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      statusCode: 400,
      field: firstIssueField(issue?.path[0], [
        "title",
        "slug",
        "description",
        "blockId",
      ] as const),
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  const title = parsed.data.title;
  const slug = normalizeSlug(parsed.data.slug);
  const description = parsed.data.description ?? "";
  const blockId = parsed.data.blockId ?? null;

  try {
    const slugError = await assertSlugAvailable(slug);
    if (slugError) return slugError;

    const blockError = await assertLayoutBlock(blockId);
    if (blockError) return blockError;

    const [created] = await db
      .insert(pagesTable)
      .values({
        title,
        slug,
        description,
        blockId,
      })
      .returning({ id: pagesTable.id });

    if (!created) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while creating the page.",
      };
    }

    const summary = await loadPageSummary(created.id);
    if (!summary) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while creating the page.",
      };
    }

    return {
      success: true,
      statusCode: 201,
      data: summary,
      message: "Page created.",
    };
  } catch (error) {
    console.error("createPage failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while creating the page.",
    );
  }
}

export async function updatePage(
  id: string,
  payload: UpdatePagePayload,
): Promise<PageResponse> {
  const parsed = updatePagePayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      statusCode: 400,
      field: firstIssueField(issue?.path[0], [
        "title",
        "slug",
        "description",
        "blockId",
      ] as const),
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  const title = parsed.data.title;
  const slug = normalizeSlug(parsed.data.slug);
  const description = parsed.data.description ?? "";
  const blockId = parsed.data.blockId ?? null;

  try {
    const existing = await db.query.pagesTable.findFirst({
      where: eq(pagesTable.id, id),
      columns: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Page not found.",
      };
    }

    const slugError = await assertSlugAvailable(slug, id);
    if (slugError) return slugError;

    const blockError = await assertLayoutBlock(blockId);
    if (blockError) return blockError;

    await db
      .update(pagesTable)
      .set({
        title,
        slug,
        description,
        blockId,
        updatedAt: new Date(),
      })
      .where(eq(pagesTable.id, id));

    const summary = await loadPageSummary(id);
    if (!summary) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while updating the page.",
      };
    }

    return {
      success: true,
      statusCode: 200,
      data: summary,
      message: "Page updated.",
    };
  } catch (error) {
    console.error("updatePage failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while updating the page.",
    );
  }
}

export async function deletePage(id: string): Promise<PageResponse> {
  try {
    const summary = await loadPageSummary(id);

    if (!summary) {
      return {
        success: false,
        statusCode: 404,
        message: "Page not found.",
      };
    }

    await db.delete(pagesTable).where(eq(pagesTable.id, id));

    return {
      success: true,
      statusCode: 200,
      data: summary,
      message: "Page deleted.",
    };
  } catch (error) {
    console.error("deletePage failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while deleting the page.",
    );
  }
}
