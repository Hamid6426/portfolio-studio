import { and, asc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";

import { db } from "@/db/client";
import {
  blocksTable,
  pagesTable,
  type BlockDocument,
  type BlockNode,
  type PublishedPageSnapshot,
} from "@/db/schema";
import { firstIssueField } from "@/lib/api/first-issue-field";
import {
  migrateBlockDocument,
  refuseWriteIfUnsupported,
  toBlockDocument,
} from "@/lib/blocks/document";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import { logError } from "@/lib/logger";
import { PAGES_CACHE_TAG, pageCacheTag } from "@/lib/pages/cache-tags";
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
  PageListItem,
  PageResponse,
  PageSummary,
} from "@/responses/pages";

const RESERVED_SLUGS = new Set([
  "home",
  "login",
  "setup",
  "setup-guide",
  "dashboard",
  "api",
  "error",
]);

function pageChildCountSql(column: typeof pagesTable.content) {
  return sql<number>`CASE
    WHEN jsonb_typeof(${column}) = 'array' THEN jsonb_array_length(${column})
    ELSE coalesce(jsonb_array_length(${column}->'nodes'), 0)
  END`.mapWith(Number);
}

function toPageListItem(row: {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  blockId: string | null;
  blockName: string | null;
  childCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  publishedAt: Date | null;
}): PageListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    blockId: row.blockId,
    blockName: row.blockName,
    childCount: row.childCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

function contentFromStored(raw: BlockDocument | BlockNode[] | null): {
  content: BlockNode[];
  contentUnreadable?: boolean;
  unsupportedVersion?: number;
} {
  const migrated = migrateBlockDocument(raw);
  if (!migrated.ok) {
    return {
      content: [],
      contentUnreadable: true,
      unsupportedVersion: migrated.version,
    };
  }
  return { content: migrated.document.nodes };
}

function toPageSummary(row: {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  content: BlockDocument | BlockNode[] | null;
  blockId: string | null;
  blockName: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  publishedAt: Date | null;
}): PageSummary {
  const { content, contentUnreadable, unsupportedVersion } = contentFromStored(
    row.content,
  );
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    content,
    contentUnreadable,
    unsupportedVersion,
    childCount: content.length,
    blockId: row.blockId,
    blockName: row.blockName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

function timestampsMatch(expected: string, actual: Date | null): boolean {
  if (!actual) return false;
  return actual.toISOString() === expected;
}

function normalizeSlug(slug: string): string | null {
  const trimmed = slug.trim();
  return trimmed.length === 0 ? null : trimmed;
}

const pageListSelect = {
  id: pagesTable.id,
  title: pagesTable.title,
  slug: pagesTable.slug,
  description: pagesTable.description,
  blockId: pagesTable.blockId,
  blockName: blocksTable.name,
  childCount: pageChildCountSql(pagesTable.content).as("child_count"),
  createdAt: pagesTable.createdAt,
  updatedAt: pagesTable.updatedAt,
  publishedAt: pagesTable.publishedAt,
} as const;

const pageDetailSelect = {
  id: pagesTable.id,
  title: pagesTable.title,
  slug: pagesTable.slug,
  description: pagesTable.description,
  content: pagesTable.content,
  blockId: pagesTable.blockId,
  blockName: blocksTable.name,
  createdAt: pagesTable.createdAt,
  updatedAt: pagesTable.updatedAt,
  publishedAt: pagesTable.publishedAt,
} as const;

/** Same as `pageDetailSelect` plus the frozen public copy, for public reads. */
const publicPageSelect = {
  ...pageDetailSelect,
  publishedSnapshot: pagesTable.publishedSnapshot,
} as const;

/** Rows are hidden everywhere once soft-deleted. */
const notDeleted = isNull(pagesTable.deletedAt);

async function loadPageSummary(id: string): Promise<PageSummary | null> {
  const rows = await db
    .select(pageDetailSelect)
    .from(pagesTable)
    .leftJoin(blocksTable, eq(pagesTable.blockId, blocksTable.id))
    .where(and(eq(pagesTable.id, id), notDeleted))
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
      .select(pageListSelect)
      .from(pagesTable)
      .leftJoin(blocksTable, eq(pagesTable.blockId, blocksTable.id))
      .where(notDeleted)
      .orderBy(asc(pagesTable.title));

    return {
      success: true,
      statusCode: 200,
      data: pages.map(toPageListItem),
    };
  } catch (error) {
    logError("listPages failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading pages.",
    );
  }
}

export async function getPageById(id: string): Promise<PageResponse> {
  try {
    const summary = await loadPageSummary(id);
    if (!summary) {
      return {
        success: false,
        statusCode: 404,
        message: "Page not found.",
      };
    }
    return {
      success: true,
      statusCode: 200,
      data: summary,
    };
  } catch (error) {
    logError("getPageById failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading the page.",
    );
  }
}

/** Loads the editable draft by slug — this backs the dashboard page editor. */
export async function getPageBySlug(slug: string | null): Promise<PageResponse> {
  try {
    const summary = await getDraftPage(slug);
    if (!summary) {
      return {
        success: false,
        statusCode: 404,
        message: "Page not found.",
      };
    }
    return {
      success: true,
      statusCode: 200,
      data: summary,
    };
  } catch (error) {
    logError("getPageBySlug failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading the page.",
    );
  }
}

function slugMatches(slug: string | null) {
  return slug === null ? isNull(pagesTable.slug) : eq(pagesTable.slug, slug);
}

/**
 * Build the public view of a published row from its snapshot.
 *
 * `publishedSnapshot` is written on every publish, so it is normally present.
 * If it is missing (for example `published_at` was set directly in SQL) we
 * fall back to the live columns rather than 404-ing a page the operator
 * clearly intends to be live.
 */
function toPublishedSummary(row: {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  content: BlockDocument | BlockNode[] | null;
  blockId: string | null;
  blockName: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  publishedAt: Date | null;
  publishedSnapshot: PublishedPageSnapshot | null;
}): PageSummary {
  const snapshot = row.publishedSnapshot;
  const rawContent = snapshot?.content ?? row.content;
  const { content, contentUnreadable, unsupportedVersion } =
    contentFromStored(rawContent);

  return {
    id: row.id,
    // The slug is the address, not content — always the live value.
    slug: row.slug,
    title: snapshot?.title ?? row.title,
    description: snapshot?.description ?? row.description,
    content,
    contentUnreadable,
    unsupportedVersion,
    childCount: content.length,
    blockId: snapshot?.blockId ?? row.blockId,
    blockName: row.blockName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

/**
 * Uncached read of the page the public site should serve: published,
 * not soft-deleted, rendered from its published snapshot.
 */
export async function getPublishedPage(
  slug: string | null,
): Promise<PageSummary | null> {
  const rows = await db
    .select(publicPageSelect)
    .from(pagesTable)
    .leftJoin(blocksTable, eq(pagesTable.blockId, blocksTable.id))
    .where(
      and(slugMatches(slug), notDeleted, isNotNull(pagesTable.publishedAt)),
    )
    .limit(1);

  const row = rows[0];
  return row ? toPublishedSummary(row) : null;
}

/** Slugs and timestamps for published pages (sitemap). */
export async function listPublishedPagePaths(): Promise<
  { slug: string | null; updatedAt: Date | null }[]
> {
  return db
    .select({
      slug: pagesTable.slug,
      updatedAt: pagesTable.updatedAt,
    })
    .from(pagesTable)
    .where(and(notDeleted, isNotNull(pagesTable.publishedAt)))
    .orderBy(asc(pagesTable.slug));
}

/**
 * Cached public read, tagged so publish/unpublish/delete can invalidate it
 * precisely. `revalidate: false` means it is only ever refreshed on demand —
 * the content changes on publish, never on a timer.
 *
 * Note this caches the *data*, not the rendered route: the root layout's
 * startup gate calls `headers()`, which opts every route into dynamic
 * rendering, so full-route prerendering is not achievable from here.
 */
export function getCachedPublishedPage(
  slug: string | null,
): Promise<PageSummary | null> {
  // Must not be "": an empty key part makes `unstable_cache` mis-key the entry
  // and the landing page reads back as a permanent miss (a 404 on `/`).
  const key = slug ?? "__root__";
  return unstable_cache(
    () => getPublishedPage(slug),
    ["public-page", key],
    { tags: [PAGES_CACHE_TAG, pageCacheTag(slug)], revalidate: false },
  )();
}

/**
 * Uncached read of the *draft* (live columns) for signed-in preview.
 * Returns a page whether or not it is published.
 */
export async function getDraftPage(
  slug: string | null,
): Promise<PageSummary | null> {
  const rows = await db
    .select(pageDetailSelect)
    .from(pagesTable)
    .leftJoin(blocksTable, eq(pagesTable.blockId, blocksTable.id))
    .where(and(slugMatches(slug), notDeleted))
    .limit(1);

  const row = rows[0];
  return row ? toPageSummary(row) : null;
}

/**
 * Drop cached public reads for the given slugs plus the collection tag.
 * Only safe to call from a Route Handler / Server Function request scope.
 */
function invalidatePageCache(...slugs: (string | null)[]): void {
  // `{ expire: 0 }`, not the "max" profile: "max" is stale-while-revalidate, so
  // the first request after a publish still serves the previous value and the
  // site appears to lag one request behind every publish/unpublish. Publishing
  // is a user-visible action that must take effect immediately.
  const immediate = { expire: 0 };
  revalidateTag(PAGES_CACHE_TAG, immediate);
  for (const slug of new Set(slugs)) {
    revalidateTag(pageCacheTag(slug), immediate);
  }
}

/**
 * Publish: freeze the current draft into `publishedSnapshot` and stamp
 * `publishedAt`. This is the only operation that changes what the public
 * site serves, so it is also the only one that must invalidate the cache.
 */
export async function publishPage(id: string): Promise<PageResponse> {
  try {
    const existing = await db.query.pagesTable.findFirst({
      where: and(eq(pagesTable.id, id), notDeleted),
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Page not found.",
      };
    }

    const contentError = refuseWriteIfUnsupported(existing.content);
    if (contentError) {
      return {
        success: false,
        statusCode: 409,
        message: contentError,
      };
    }

    const contentMigrated = migrateBlockDocument(existing.content);
    if (!contentMigrated.ok) {
      return {
        success: false,
        statusCode: 409,
        message: `This page uses an unsupported document version (${contentMigrated.version}). Upgrade the app before publishing.`,
      };
    }

    let layoutChildren = toBlockDocument([]);
    if (existing.blockId) {
      const layout = await db.query.blocksTable.findFirst({
        where: eq(blocksTable.id, existing.blockId),
        columns: { publishedChildren: true },
      });
      if (layout?.publishedChildren) {
        const layoutMigrated = migrateBlockDocument(layout.publishedChildren);
        if (layoutMigrated.ok) {
          layoutChildren = layoutMigrated.document;
        }
      }
    }

    const snapshot: PublishedPageSnapshot = {
      title: existing.title,
      description: existing.description,
      blockId: existing.blockId,
      content: contentMigrated.document,
      layoutChildren,
    };

    await db
      .update(pagesTable)
      .set({
        publishedSnapshot: snapshot,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pagesTable.id, id));

    invalidatePageCache(existing.slug);

    const summary = await loadPageSummary(id);
    if (!summary) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while publishing the page.",
      };
    }

    return {
      success: true,
      statusCode: 200,
      data: summary,
      message: "Page published.",
    };
  } catch (error) {
    logError("publishPage failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while publishing the page.",
    );
  }
}

/**
 * Unpublish: clear `publishedAt` so the page 404s publicly again. The
 * snapshot is intentionally kept, so re-publishing an untouched page is a
 * no-op and the last live copy stays inspectable.
 */
export async function unpublishPage(id: string): Promise<PageResponse> {
  try {
    const existing = await db.query.pagesTable.findFirst({
      where: and(eq(pagesTable.id, id), notDeleted),
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Page not found.",
      };
    }

    await db
      .update(pagesTable)
      .set({ publishedAt: null, updatedAt: new Date() })
      .where(eq(pagesTable.id, id));

    invalidatePageCache(existing.slug);

    const summary = await loadPageSummary(id);
    if (!summary) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while unpublishing the page.",
      };
    }

    return {
      success: true,
      statusCode: 200,
      data: summary,
      message: "Page unpublished.",
    };
  } catch (error) {
    logError("unpublishPage failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while unpublishing the page.",
    );
  }
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
        "content",
      ] as const),
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  const title = parsed.data.title;
  const slug = normalizeSlug(parsed.data.slug);
  const description = parsed.data.description ?? "";
  const blockId = parsed.data.blockId ?? null;
  const content = parsed.data.content ?? [];

  try {
    const slugError = await assertSlugAvailable(slug);
    if (slugError) return slugError;

    const normalizedBlockId =
      blockId && blockId.length > 0 ? blockId : null;
    const blockError = await assertLayoutBlock(normalizedBlockId);
    if (blockError) return blockError;

    const [created] = await db
      .insert(pagesTable)
      .values({
        title,
        slug,
        description,
        blockId: normalizedBlockId,
        content: toBlockDocument(content),
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
    logError("createPage failed:", error);
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
        "content",
        "expectedUpdatedAt",
      ] as const),
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  try {
    const existing = await db.query.pagesTable.findFirst({
      where: eq(pagesTable.id, id),
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Page not found.",
      };
    }

    if (
      !timestampsMatch(parsed.data.expectedUpdatedAt, existing.updatedAt)
    ) {
      return {
        success: false,
        statusCode: 409,
        message:
          "This page was changed elsewhere. Reload to see the latest version.",
      };
    }

    if (parsed.data.content !== undefined) {
      const writeError = refuseWriteIfUnsupported(existing.content);
      if (writeError) {
        return {
          success: false,
          statusCode: 409,
          message: writeError,
        };
      }
    }

    const updates: {
      title?: string;
      slug?: string | null;
      description?: string;
      blockId?: string | null;
      content?: BlockDocument;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (parsed.data.title !== undefined) {
      updates.title = parsed.data.title;
    }

    if (parsed.data.slug !== undefined) {
      const slug = normalizeSlug(parsed.data.slug);
      const slugError = await assertSlugAvailable(slug, id);
      if (slugError) return slugError;
      updates.slug = slug;
    }

    if (parsed.data.description !== undefined) {
      updates.description = parsed.data.description;
    }

    if (parsed.data.blockId !== undefined) {
      const normalizedBlockId =
        parsed.data.blockId && parsed.data.blockId.length > 0
          ? parsed.data.blockId
          : null;
      const blockError = await assertLayoutBlock(normalizedBlockId);
      if (blockError) return blockError;
      updates.blockId = normalizedBlockId;
    }

    if (parsed.data.content !== undefined) {
      updates.content = toBlockDocument(parsed.data.content);
    }

    await db.update(pagesTable).set(updates).where(eq(pagesTable.id, id));

    // Edits never reach the public site — it serves `publishedSnapshot` until
    // the next publish. The one exception is the slug, which is the page's
    // address rather than its content: moving it changes both URLs at once.
    const slugChanged =
      updates.slug !== undefined && updates.slug !== existing.slug;

    if (existing.publishedAt !== null && slugChanged) {
      invalidatePageCache(existing.slug, updates.slug ?? null);
    }

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
    logError("updatePage failed:", error);
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

    invalidatePageCache(summary.slug);

    return {
      success: true,
      statusCode: 200,
      data: summary,
      message: "Page deleted.",
    };
  } catch (error) {
    logError("deletePage failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while deleting the page.",
    );
  }
}
