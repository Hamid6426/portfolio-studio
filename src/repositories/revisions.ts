import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { contentRevisionsTable } from "@/db/schema";
import type { BlockDocument, BlockNode } from "@/db/schema.types";
import {
  migrateBlockDocument,
  toBlockDocument,
} from "@/lib/blocks/document";
import { logError } from "@/lib/logger";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";

export type RevisionEntityType = "page" | "block";
export type RevisionSource = "autosave" | "manual" | "restore";

/** Keep the newest N revisions per entity; older rows are deleted. */
export const MAX_REVISIONS_PER_ENTITY = 50;

/**
 * Minimum gap between autosave revisions for the same entity when the tree
 * changed. Manual / restore always record when content differs.
 */
export const AUTOSAVE_REVISION_INTERVAL_MS = 5 * 60 * 1000;

export type ContentRevisionSummary = {
  id: string;
  entityType: RevisionEntityType;
  entityId: string;
  source: RevisionSource;
  createdAt: Date | string | null;
  createdBy: string | null;
};

export type ContentRevisionDetail = ContentRevisionSummary & {
  content: BlockNode[];
  contentUnreadable?: boolean;
  unsupportedVersion?: number;
};

export type ListRevisionsResponse =
  | ApiSuccessResponse<ContentRevisionSummary[]>
  | ApiErrorResponse;

export type RevisionResponse =
  | ApiSuccessResponse<ContentRevisionDetail>
  | ApiErrorResponse;

export function shouldCreateRevision(args: {
  source: RevisionSource;
  contentMatchesLatest: boolean;
  latestCreatedAt: Date | null;
  now?: number;
  autosaveIntervalMs?: number;
}): boolean {
  if (args.contentMatchesLatest) return false;
  if (args.source !== "autosave") return true;
  if (!args.latestCreatedAt) return true;
  const now = args.now ?? Date.now();
  const interval = args.autosaveIntervalMs ?? AUTOSAVE_REVISION_INTERVAL_MS;
  return now - args.latestCreatedAt.getTime() >= interval;
}

function documentKey(document: BlockDocument): string {
  return JSON.stringify(document.nodes);
}

async function latestRevision(entityType: RevisionEntityType, entityId: string) {
  const rows = await db
    .select()
    .from(contentRevisionsTable)
    .where(
      and(
        eq(contentRevisionsTable.entityType, entityType),
        eq(contentRevisionsTable.entityId, entityId),
      ),
    )
    .orderBy(desc(contentRevisionsTable.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

async function pruneOldRevisions(
  entityType: RevisionEntityType,
  entityId: string,
) {
  const keep = await db
    .select({
      createdAt: contentRevisionsTable.createdAt,
    })
    .from(contentRevisionsTable)
    .where(
      and(
        eq(contentRevisionsTable.entityType, entityType),
        eq(contentRevisionsTable.entityId, entityId),
      ),
    )
    .orderBy(desc(contentRevisionsTable.createdAt))
    .limit(MAX_REVISIONS_PER_ENTITY);

  const cutoff = keep.at(-1)?.createdAt;
  if (!cutoff || keep.length < MAX_REVISIONS_PER_ENTITY) return;

  // Delete strictly older than the oldest kept row (same timestamp edge: keep all).
  await db
    .delete(contentRevisionsTable)
    .where(
      and(
        eq(contentRevisionsTable.entityType, entityType),
        eq(contentRevisionsTable.entityId, entityId),
        sql`${contentRevisionsTable.createdAt} < ${cutoff}`,
      ),
    );
}

/**
 * Persist a revision when content changed and throttle rules allow.
 * Failures are logged and swallowed — saving the live draft must not fail
 * because history could not be written.
 */
export async function maybeRecordRevision(args: {
  entityType: RevisionEntityType;
  entityId: string;
  nodes: BlockNode[];
  source: RevisionSource;
  createdBy?: string | null;
}): Promise<void> {
  try {
    const document = toBlockDocument(args.nodes);
    const latest = await latestRevision(args.entityType, args.entityId);
    const contentMatchesLatest = latest
      ? documentKey(latest.document) === documentKey(document)
      : false;

    if (
      !shouldCreateRevision({
        source: args.source,
        contentMatchesLatest,
        latestCreatedAt: latest?.createdAt ?? null,
      })
    ) {
      return;
    }

    await db.insert(contentRevisionsTable).values({
      entityType: args.entityType,
      entityId: args.entityId,
      document,
      source: args.source,
      createdBy: args.createdBy ?? null,
      updatedAt: new Date(),
    });

    await pruneOldRevisions(args.entityType, args.entityId);
  } catch (error) {
    logError("maybeRecordRevision failed:", error);
  }
}

export async function listRevisions(
  entityType: RevisionEntityType,
  entityId: string,
): Promise<ListRevisionsResponse> {
  try {
    const rows = await db
      .select({
        id: contentRevisionsTable.id,
        entityType: contentRevisionsTable.entityType,
        entityId: contentRevisionsTable.entityId,
        source: contentRevisionsTable.source,
        createdAt: contentRevisionsTable.createdAt,
        createdBy: contentRevisionsTable.createdBy,
      })
      .from(contentRevisionsTable)
      .where(
        and(
          eq(contentRevisionsTable.entityType, entityType),
          eq(contentRevisionsTable.entityId, entityId),
        ),
      )
      .orderBy(desc(contentRevisionsTable.createdAt))
      .limit(MAX_REVISIONS_PER_ENTITY);

    return {
      success: true,
      statusCode: 200,
      data: rows.map((row) => ({
        id: row.id,
        entityType: row.entityType as RevisionEntityType,
        entityId: row.entityId,
        source: row.source as RevisionSource,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
      })),
      message: "Revisions loaded.",
    };
  } catch (error) {
    logError("listRevisions failed:", error);
    return {
      success: false,
      statusCode: 500,
      message: "Something went wrong while loading history.",
    };
  }
}

export async function getRevision(
  entityType: RevisionEntityType,
  entityId: string,
  revisionId: string,
): Promise<RevisionResponse> {
  try {
    const row = (
      await db
        .select()
        .from(contentRevisionsTable)
        .where(
          and(
            eq(contentRevisionsTable.id, revisionId),
            eq(contentRevisionsTable.entityType, entityType),
            eq(contentRevisionsTable.entityId, entityId),
          ),
        )
        .limit(1)
    )[0];

    if (!row) {
      return {
        success: false,
        statusCode: 404,
        message: "Revision not found.",
      };
    }

    const migrated = migrateBlockDocument(row.document);
    if (!migrated.ok) {
      return {
        success: true,
        statusCode: 200,
        data: {
          id: row.id,
          entityType: row.entityType as RevisionEntityType,
          entityId: row.entityId,
          source: row.source as RevisionSource,
          createdAt: row.createdAt,
          createdBy: row.createdBy,
          content: [],
          contentUnreadable: true,
          unsupportedVersion: migrated.version,
        },
        message: "Revision loaded.",
      };
    }

    return {
      success: true,
      statusCode: 200,
      data: {
        id: row.id,
        entityType: row.entityType as RevisionEntityType,
        entityId: row.entityId,
        source: row.source as RevisionSource,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
        content: migrated.document.nodes,
      },
      message: "Revision loaded.",
    };
  } catch (error) {
    logError("getRevision failed:", error);
    return {
      success: false,
      statusCode: 500,
      message: "Something went wrong while loading the revision.",
    };
  }
}

/** Used by restore routes to fetch the document before writing the draft. */
export async function loadRevisionDocument(
  entityType: RevisionEntityType,
  entityId: string,
  revisionId: string,
): Promise<
  | { ok: true; nodes: BlockNode[] }
  | { ok: false; statusCode: 404 | 409; message: string }
> {
  const row = (
    await db
      .select()
      .from(contentRevisionsTable)
      .where(
        and(
          eq(contentRevisionsTable.id, revisionId),
          eq(contentRevisionsTable.entityType, entityType),
          eq(contentRevisionsTable.entityId, entityId),
        ),
      )
      .limit(1)
  )[0];

  if (!row) {
    return { ok: false, statusCode: 404, message: "Revision not found." };
  }

  const migrated = migrateBlockDocument(row.document);
  if (!migrated.ok) {
    return {
      ok: false,
      statusCode: 409,
      message: `This revision uses document version ${migrated.version}, which this app cannot read.`,
    };
  }

  return { ok: true, nodes: migrated.document.nodes };
}
