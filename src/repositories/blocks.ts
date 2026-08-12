import { asc, eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@/db/client";
import {
  blocksTable,
  pagesTable,
  type BlockDocument,
  type BlockNode,
} from "@/db/schema";
import { firstIssueField } from "@/lib/api/first-issue-field";
import {
  migrateBlockDocument,
  refuseWriteIfUnsupported,
  toBlockDocument,
} from "@/lib/blocks/document";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import { PAGES_CACHE_TAG, pageCacheTag } from "@/lib/pages/cache-tags";
import type {
  CreateBlockPayload,
  UpdateBlockPayload,
} from "@/payloads/blocks";
import {
  createBlockPayloadSchema,
  updateBlockPayloadSchema,
} from "@/payloads/blocks";
import type {
  BlockListItem,
  BlockResponse,
  BlockSummary,
  ListBlocksResponse,
} from "@/responses/blocks";

function childCountSql(column: typeof blocksTable.children) {
  return sql<number>`CASE
    WHEN jsonb_typeof(${column}) = 'array' THEN jsonb_array_length(${column})
    ELSE coalesce(jsonb_array_length(${column}->'nodes'), 0)
  END`.mapWith(Number);
}

function toBlockListItem(block: {
  id: string;
  name: string;
  description: string;
  canBeLayout: boolean;
  childCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  publishedAt: Date | null;
}): BlockListItem {
  return {
    id: block.id,
    name: block.name,
    description: block.description,
    canBeLayout: block.canBeLayout,
    childCount: block.childCount,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
    publishedAt: block.publishedAt,
  };
}

function toBlockSummary(block: {
  id: string;
  name: string;
  description: string;
  canBeLayout: boolean;
  children: BlockDocument | BlockNode[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  publishedAt: Date | null;
}): BlockSummary {
  const migrated = migrateBlockDocument(block.children);
  const unreadable = !migrated.ok;
  return {
    id: block.id,
    name: block.name,
    description: block.description,
    canBeLayout: block.canBeLayout,
    childCount: migrated.ok ? migrated.document.nodes.length : 0,
    children: migrated.ok ? migrated.document.nodes : [],
    contentUnreadable: unreadable || undefined,
    unsupportedVersion:
      unreadable && migrated.reason === "unsupported-version"
        ? migrated.version
        : undefined,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
    publishedAt: block.publishedAt,
  };
}

function timestampsMatch(
  expected: string | undefined,
  actual: Date | null,
): boolean {
  if (expected === undefined) return true;
  if (!actual) return false;
  return actual.toISOString() === expected;
}

const listBlockColumns = {
  id: blocksTable.id,
  name: blocksTable.name,
  description: blocksTable.description,
  canBeLayout: blocksTable.canBeLayout,
  childCount: childCountSql(blocksTable.children).as("child_count"),
  createdAt: blocksTable.createdAt,
  updatedAt: blocksTable.updatedAt,
  publishedAt: blocksTable.publishedAt,
} as const;

const blockDetailColumns = {
  id: blocksTable.id,
  name: blocksTable.name,
  description: blocksTable.description,
  canBeLayout: blocksTable.canBeLayout,
  children: blocksTable.children,
  publishedChildren: blocksTable.publishedChildren,
  createdAt: blocksTable.createdAt,
  updatedAt: blocksTable.updatedAt,
  publishedAt: blocksTable.publishedAt,
} as const;

export async function listBlocks(): Promise<ListBlocksResponse> {
  try {
    const blocks = await db
      .select(listBlockColumns)
      .from(blocksTable)
      .orderBy(asc(blocksTable.name));

    return {
      success: true,
      statusCode: 200,
      data: blocks.map(toBlockListItem),
    };
  } catch (error) {
    console.error("listBlocks failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading blocks.",
    );
  }
}

export async function listLayoutBlocks(): Promise<ListBlocksResponse> {
  try {
    const blocks = await db
      .select(listBlockColumns)
      .from(blocksTable)
      .where(eq(blocksTable.canBeLayout, true))
      .orderBy(asc(blocksTable.name));

    return {
      success: true,
      statusCode: 200,
      data: blocks.map(toBlockListItem),
    };
  } catch (error) {
    console.error("listLayoutBlocks failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading layout blocks.",
    );
  }
}

/** Raw loader for server components rendering a page's layout block. */
export async function getBlockById(id: string): Promise<BlockSummary | null> {
  const rows = await db
    .select(blockDetailColumns)
    .from(blocksTable)
    .where(eq(blocksTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? toBlockSummary(row) : null;
}

export type LayoutBlockNodesResult =
  | { ok: true; nodes: BlockNode[] }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "unsupported-version"; version: number };

/**
 * Layout nodes for public rendering or draft preview.
 * Published reads use `published_children`; preview uses draft `children`.
 */
export async function getLayoutBlockNodes(
  id: string,
  source: "draft" | "published",
): Promise<LayoutBlockNodesResult> {
  const rows = await db
    .select({
      children: blocksTable.children,
      publishedChildren: blocksTable.publishedChildren,
    })
    .from(blocksTable)
    .where(eq(blocksTable.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return { ok: false, reason: "not-found" };

  const raw =
    source === "draft"
      ? row.children
      : (row.publishedChildren ?? { version: 1, nodes: [] });

  const migrated = migrateBlockDocument(raw);
  if (!migrated.ok) {
    return {
      ok: false,
      reason: "unsupported-version",
      version: migrated.version,
    };
  }

  return { ok: true, nodes: migrated.document.nodes };
}

/** Same lookup as `getBlockById`, wrapped for API route handlers. */
export async function getBlockResponseById(id: string): Promise<BlockResponse> {
  try {
    const summary = await getBlockById(id);

    if (!summary) {
      return {
        success: false,
        statusCode: 404,
        message: "Block not found.",
      };
    }

    return {
      success: true,
      statusCode: 200,
      data: summary,
    };
  } catch (error) {
    console.error("getBlockResponseById failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading the block.",
    );
  }
}

export async function createBlock(
  payload: CreateBlockPayload,
): Promise<BlockResponse> {
  const parsed = createBlockPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      statusCode: 400,
      field: firstIssueField(issue?.path[0], [
        "name",
        "description",
        "canBeLayout",
        "children",
      ] as const),
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  const { name, description, canBeLayout, children } = parsed.data;

  try {
    const [created] = await db
      .insert(blocksTable)
      .values({
        name,
        description: description ?? "",
        canBeLayout: canBeLayout ?? false,
        children: toBlockDocument(children ?? []),
      })
      .returning();

    if (!created) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while creating the block.",
      };
    }

    return {
      success: true,
      statusCode: 201,
      data: toBlockSummary(created),
      message: "Block created.",
    };
  } catch (error) {
    console.error("createBlock failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while creating the block.",
    );
  }
}

export async function updateBlock(
  id: string,
  payload: UpdateBlockPayload,
): Promise<BlockResponse> {
  const parsed = updateBlockPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      statusCode: 400,
      field: firstIssueField(issue?.path[0], [
        "name",
        "description",
        "canBeLayout",
        "children",
        "expectedUpdatedAt",
      ] as const),
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  try {
    const existing = await db.query.blocksTable.findFirst({
      where: eq(blocksTable.id, id),
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Block not found.",
      };
    }

    if (
      !timestampsMatch(parsed.data.expectedUpdatedAt, existing.updatedAt)
    ) {
      return {
        success: false,
        statusCode: 409,
        message:
          "This block was changed elsewhere. Reload to see the latest version.",
      };
    }

    const writeError = refuseWriteIfUnsupported(existing.children);
    if (writeError && parsed.data.children !== undefined) {
      return {
        success: false,
        statusCode: 409,
        message: writeError,
      };
    }

    if (
      parsed.data.canBeLayout === false &&
      existing.canBeLayout
    ) {
      const attached = await db.query.pagesTable.findFirst({
        where: eq(pagesTable.blockId, id),
        columns: { id: true },
      });
      if (attached) {
        return {
          success: false,
          statusCode: 400,
          field: "canBeLayout",
          message:
            "This block is attached to a page. Detach it before disabling layout use.",
        };
      }
    }

    const updates: {
      name?: string;
      description?: string;
      canBeLayout?: boolean;
      children?: BlockDocument;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name;
    }
    if (parsed.data.description !== undefined) {
      updates.description = parsed.data.description;
    }
    if (parsed.data.canBeLayout !== undefined) {
      updates.canBeLayout = parsed.data.canBeLayout;
    }
    if (parsed.data.children !== undefined) {
      updates.children = toBlockDocument(parsed.data.children);
    }

    const [updated] = await db
      .update(blocksTable)
      .set(updates)
      .where(eq(blocksTable.id, id))
      .returning();

    if (!updated) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while updating the block.",
      };
    }

    return {
      success: true,
      statusCode: 200,
      data: toBlockSummary(updated),
      message: "Block updated.",
    };
  } catch (error) {
    console.error("updateBlock failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while updating the block.",
    );
  }
}

function invalidatePagesUsingBlock(blockId: string, slugs: (string | null)[]) {
  const immediate = { expire: 0 };
  revalidateTag(PAGES_CACHE_TAG, immediate);
  for (const slug of new Set(slugs)) {
    revalidateTag(pageCacheTag(slug), immediate);
  }
}

/**
 * Publish a layout block: freeze draft `children` into `published_children`.
 * Public pages that reference this block read the published tree.
 */
export async function publishBlock(id: string): Promise<BlockResponse> {
  try {
    const existing = await db.query.blocksTable.findFirst({
      where: eq(blocksTable.id, id),
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Block not found.",
      };
    }

    const writeError = refuseWriteIfUnsupported(existing.children);
    if (writeError) {
      return {
        success: false,
        statusCode: 409,
        message: writeError,
      };
    }

    const migrated = migrateBlockDocument(existing.children);
    if (!migrated.ok) {
      return {
        success: false,
        statusCode: 409,
        message: `This block uses an unsupported document version (${migrated.version}). Upgrade the app before publishing.`,
      };
    }

    const [updated] = await db
      .update(blocksTable)
      .set({
        publishedChildren: migrated.document,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blocksTable.id, id))
      .returning();

    if (!updated) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while publishing the block.",
      };
    }

    const attachedPages = await db
      .select({ slug: pagesTable.slug })
      .from(pagesTable)
      .where(eq(pagesTable.blockId, id));

    invalidatePagesUsingBlock(
      id,
      attachedPages.map((page) => page.slug),
    );

    return {
      success: true,
      statusCode: 200,
      data: toBlockSummary(updated),
      message: "Block published.",
    };
  } catch (error) {
    console.error("publishBlock failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while publishing the block.",
    );
  }
}

export async function deleteBlock(id: string): Promise<BlockResponse> {
  try {
    const existing = await db.query.blocksTable.findFirst({
      where: eq(blocksTable.id, id),
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Block not found.",
      };
    }

    const attached = await db.query.pagesTable.findFirst({
      where: eq(pagesTable.blockId, id),
      columns: { id: true },
    });

    if (attached) {
      return {
        success: false,
        statusCode: 400,
        message:
          "This block is still attached to a page. Detach it before deleting.",
      };
    }

    await db.delete(blocksTable).where(eq(blocksTable.id, id));

    return {
      success: true,
      statusCode: 200,
      data: toBlockSummary(existing),
      message: "Block deleted.",
    };
  } catch (error) {
    console.error("deleteBlock failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while deleting the block.",
    );
  }
}