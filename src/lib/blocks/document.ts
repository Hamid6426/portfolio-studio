import type { BlockDocument, BlockNode } from "@/db/schema.types";
import {
  normalizeResponsiveStyles,
  type ResponsiveStyles,
} from "@/lib/blocks/styles";

/**
 * Current on-disk shape for `pages.content`, `blocks.children`, and
 * `published_snapshot.content`. Bump this when the tree model changes and
 * add a step in {@link migrateBlockDocument}.
 *
 * v2: `BlockNode.styles` is {@link ResponsiveStyles} (`base`/`sm`/`md`/`lg`/`hover`)
 * instead of a flat property map.
 */
export const CURRENT_BLOCK_DOCUMENT_VERSION = 2;

export type MigrateResult =
  | { ok: true; document: BlockDocument }
  | { ok: false; reason: "unsupported-version"; version: number };

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

/** Read the stored version without upgrading legacy shapes. */
export function storedDocumentVersion(raw: unknown): number {
  if (raw == null) return 0;
  if (Array.isArray(raw)) return 0;
  if (!raw || typeof raw !== "object") return 0;
  const record = raw as { version?: unknown };
  return typeof record.version === "number" && Number.isFinite(record.version)
    ? record.version
    : 0;
}

/**
 * Refuse writes when the stored jsonb was saved by a newer build. Call before
 * persisting edits to `content` / `children` / `publishedChildren`.
 */
export function refuseWriteIfUnsupported(raw: unknown): string | null {
  const version = storedDocumentVersion(raw);
  if (version > CURRENT_BLOCK_DOCUMENT_VERSION) {
    return `This content was saved with a newer editor (version ${version}). Upgrade the app before editing.`;
  }
  return null;
}

/**
 * Bring any stored jsonb value up to {@link CURRENT_BLOCK_DOCUMENT_VERSION}.
 *
 * Accepts:
 * - legacy bare `BlockNode[]` (treated as version 0)
 * - `{ version, nodes }` documents at any older version
 * - null / garbage → empty current document
 *
 * Newer-than-this-build documents return `unsupported-version` — they must not
 * be clamped or written back down. Version is read **before** shape-checking so
 * a future `{ version: 3, tree: [...] }` cannot fall through as an empty page
 * (audit B6).
 *
 * Call this on every read path. Writes should go through {@link toBlockDocument}.
 */
export function migrateBlockDocument(raw: unknown): MigrateResult {
  if (raw == null) {
    return { ok: true, document: { ...EMPTY_BLOCK_DOCUMENT, nodes: [] } };
  }

  if (Array.isArray(raw)) {
    return migrateNodes(0, raw as BlockNode[]);
  }

  if (!raw || typeof raw !== "object") {
    return { ok: true, document: { ...EMPTY_BLOCK_DOCUMENT, nodes: [] } };
  }

  const record = raw as { version?: unknown; nodes?: unknown };
  const version =
    typeof record.version === "number" && Number.isFinite(record.version)
      ? record.version
      : 0;

  if (version > CURRENT_BLOCK_DOCUMENT_VERSION) {
    return { ok: false, reason: "unsupported-version", version };
  }

  if (!Array.isArray(record.nodes)) {
    // Known version but unexpected shape — treat as empty rather than
    // inventing nodes; refuseWriteIfUnsupported still blocks newer versions.
    return { ok: true, document: { ...EMPTY_BLOCK_DOCUMENT, nodes: [] } };
  }

  return migrateNodes(version, record.nodes as BlockNode[]);
}

/** Convenience: migrate then return only the node tree for editors/APIs. */
export function nodesFromStored(raw: unknown): BlockNode[] {
  const result = migrateBlockDocument(raw);
  return result.ok ? result.document.nodes : [];
}

/** True when {@link migrateBlockDocument} would refuse to render the tree. */
export function isUnsupportedStoredDocument(raw: unknown): boolean {
  const result = migrateBlockDocument(raw);
  return !result.ok && result.reason === "unsupported-version";
}

function migrateV1StylesToV2(nodes: BlockNode[]): BlockNode[] {
  return nodes.map((node) => {
    const styles = normalizeResponsiveStyles(node.styles) as ResponsiveStyles;
    const next: BlockNode = {
      ...node,
      styles: Object.keys(styles).length > 0 ? styles : undefined,
    };
    if (node.children?.length) {
      next.children = migrateV1StylesToV2(node.children);
    }
    return next;
  });
}

/**
 * Version-to-version transforms. v0 → v1 only wraps the array; v1 → v2 wraps
 * flat style maps into `{ base }`.
 */
function migrateNodes(fromVersion: number, nodes: BlockNode[]): MigrateResult {
  let version = fromVersion;
  let current = nodes;

  if (version < 0) version = 0;

  // v0 (bare array) → v1 (document wrapper): structure unchanged.
  if (version < 1) {
    version = 1;
  }

  if (version < 2) {
    current = migrateV1StylesToV2(current);
    version = 2;
  }

  if (version > CURRENT_BLOCK_DOCUMENT_VERSION) {
    return { ok: false, reason: "unsupported-version", version };
  }

  return {
    ok: true,
    document: {
      version: CURRENT_BLOCK_DOCUMENT_VERSION,
      nodes: current,
    },
  };
}
