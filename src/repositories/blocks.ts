import { asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { blocksTable, pagesTable, type BlockNode } from "@/db/schema";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import type {
  CreateBlockPayload,
  UpdateBlockPayload,
} from "@/payloads/blocks";
import {
  createBlockPayloadSchema,
  updateBlockPayloadSchema,
} from "@/payloads/blocks";
import type {
  BlockResponse,
  BlockSummary,
  ListBlocksResponse,
} from "@/responses/blocks";

function toBlockSummary(block: {
  id: string;
  name: string;
  description: string;
  canBeLayout: boolean;
  children: BlockNode[] | null;
  createdAt: Date | null;
  publishedAt: Date | null;
}): BlockSummary {
  const children = block.children ?? [];
  return {
    id: block.id,
    name: block.name,
    description: block.description,
    canBeLayout: block.canBeLayout,
    childCount: children.length,
    children,
    createdAt: block.createdAt,
    publishedAt: block.publishedAt,
  };
}

function firstIssueField<T extends string>(
  path: PropertyKey | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((value) => value === path);
}

const blockColumns = {
  id: blocksTable.id,
  name: blocksTable.name,
  description: blocksTable.description,
  canBeLayout: blocksTable.canBeLayout,
  children: blocksTable.children,
  createdAt: blocksTable.createdAt,
  publishedAt: blocksTable.publishedAt,
} as const;

export async function listBlocks(): Promise<ListBlocksResponse> {
  try {
    const blocks = await db
      .select(blockColumns)
      .from(blocksTable)
      .orderBy(asc(blocksTable.name));

    return {
      success: true,
      statusCode: 200,
      data: blocks.map(toBlockSummary),
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
      .select(blockColumns)
      .from(blocksTable)
      .where(eq(blocksTable.canBeLayout, true))
      .orderBy(asc(blocksTable.name));

    return {
      success: true,
      statusCode: 200,
      data: blocks.map(toBlockSummary),
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
    .select(blockColumns)
    .from(blocksTable)
    .where(eq(blocksTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? toBlockSummary(row) : null;
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
        children: children ?? [],
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
      ] as const),
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  const { name, description, canBeLayout, children } = parsed.data;

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

    if (existing.canBeLayout && !canBeLayout) {
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

    const [updated] = await db
      .update(blocksTable)
      .set({
        name,
        description: description ?? "",
        canBeLayout: canBeLayout ?? false,
        ...(children === undefined ? {} : { children }),
        updatedAt: new Date(),
      })
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
