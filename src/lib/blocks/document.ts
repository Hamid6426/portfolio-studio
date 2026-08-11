import type { BlockDocument, BlockNode } from "@/db/schema";

/**
 * Current on-disk shape for `pages.content`, `blocks.children`, and
 * `published_snapshot.content`. Bump this when the tree model changes and
 * add a step in {@link migrateBlockDocument}.
 */
export const CURRENT_BLOCK_DOCUMENT_VERSION = 1;

const EMPTY_BLOCK_DOCUMENT: BlockDocument = {
  version: CURRENT_BLOCK_DOCUMENT_VERSION,
  nodes: [],
};

/**
 * Wrap a node tree for storage. Always writes the current version so the next
 * reader never has to guess.
 */
export function toBlockDocument(nodes: BlockNode[]): BlockDocument {
  return {
    version: CURRENT_BLOCK_DOCUMENT_VERSION,
    nodes,
  };
}

function isBlockDocument(value: unknown): value is BlockDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as { version?: unknown; nodes?: unknown };
  return Array.isArray(record.nodes);
}

/**
 * Bring any stored jsonb value up to {@link CURRENT_BLOCK_DOCUMENT_VERSION}.
 *
 * Accepts:
 * - legacy bare `BlockNode[]` (treated as version 0)
 * - `{ version, nodes }` documents at any older version
 * - null / garbage → empty current document
 *
 * Call this on every read path. Writes should go through {@link toBlockDocument}.
 */
export function migrateBlockDocument(raw: unknown): BlockDocument {
  if (raw == null) {
    return { ...EMPTY_BLOCK_DOCUMENT, nodes: [] };
  }

  if (Array.isArray(raw)) {
    return migrateNodes(0, raw as BlockNode[]);
  }

  if (isBlockDocument(raw)) {
    const version =
      typeof raw.version === "number" && Number.isFinite(raw.version)
        ? raw.version
        : 0;
    return migrateNodes(version, raw.nodes);
  }

  return { ...EMPTY_BLOCK_DOCUMENT, nodes: [] };
}

/** Convenience: migrate then return only the node tree for editors/APIs. */
export function nodesFromStored(raw: unknown): BlockNode[] {
  return migrateBlockDocument(raw).nodes;
}

/**
 * Version-to-version transforms. v0 → v1 only wraps the array; later bumps
 * land here as pure functions over `nodes`.
 */
function migrateNodes(fromVersion: number, nodes: BlockNode[]): BlockDocument {
  let version = fromVersion;
  let current = nodes;

  if (version < 0) version = 0;

  // v0 (bare array) → v1 (document wrapper): structure unchanged.
  if (version < 1) {
    version = 1;
  }

  // Future: if (version < 2) { current = migrateV1ToV2(current); version = 2; }

  if (version > CURRENT_BLOCK_DOCUMENT_VERSION) {
    // Newer than this build — keep nodes, clamp version so we can still render.
    version = CURRENT_BLOCK_DOCUMENT_VERSION;
  }

  return {
    version: CURRENT_BLOCK_DOCUMENT_VERSION,
    nodes: current,
  };
}
