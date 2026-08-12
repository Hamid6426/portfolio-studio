import { describe, expect, it } from "vitest";

import {
  CURRENT_BLOCK_DOCUMENT_VERSION,
  migrateBlockDocument,
  nodesFromStored,
  refuseWriteIfUnsupported,
  storedDocumentVersion,
  toBlockDocument,
} from "@/lib/blocks/document";

describe("migrateBlockDocument", () => {
  it("wraps a legacy bare array as v1", () => {
    const nodes = [{ id: "1", type: "text", props: { text: "hi" } }];
    const doc = migrateBlockDocument(nodes);
    expect(doc.ok).toBe(true);
    if (!doc.ok) return;
    expect(doc.document.version).toBe(CURRENT_BLOCK_DOCUMENT_VERSION);
    expect(doc.document.nodes).toEqual(nodes);
  });

  it("passes through a current document", () => {
    const doc = toBlockDocument([
      { id: "1", type: "text", props: { text: "hi" } },
    ]);
    expect(migrateBlockDocument(doc)).toEqual({ ok: true, document: doc });
  });

  it("returns empty for null and garbage", () => {
    expect(nodesFromStored(null)).toEqual([]);
    expect(nodesFromStored(undefined)).toEqual([]);
    expect(nodesFromStored({})).toEqual([]);
    expect(nodesFromStored("nope")).toEqual([]);
  });

  it("refuses a future version instead of clamping", () => {
    const nodes = [{ id: "1", type: "text", props: { text: "hi" } }];
    const result = migrateBlockDocument({ version: 99, nodes });
    expect(result).toEqual({
      ok: false,
      reason: "unsupported-version",
      version: 99,
    });
    expect(nodesFromStored({ version: 99, nodes })).toEqual([]);
  });

  it("refuses writes when stored version exceeds current", () => {
    expect(
      refuseWriteIfUnsupported({ version: 99, nodes: [] }),
    ).toMatch(/newer editor/);
    expect(refuseWriteIfUnsupported(toBlockDocument([]))).toBeNull();
    expect(storedDocumentVersion([{ id: "1", type: "text", props: {} }])).toBe(
      0,
    );
  });
});
