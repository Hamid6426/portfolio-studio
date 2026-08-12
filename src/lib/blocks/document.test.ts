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
  it("wraps a legacy bare array and flat styles up to v2", () => {
    const nodes = [
      {
        id: "1",
        type: "text",
        props: { text: "hi" },
        styles: { color: "#fff", padding: "8px" },
      },
    ];
    const doc = migrateBlockDocument(nodes);
    expect(doc.ok).toBe(true);
    if (!doc.ok) return;
    expect(doc.document.version).toBe(CURRENT_BLOCK_DOCUMENT_VERSION);
    expect(doc.document.nodes[0]?.styles).toEqual({
      base: { color: "#fff", padding: "8px" },
    });
  });

  it("upgrades an explicit v1 document to v2 styles", () => {
    const result = migrateBlockDocument({
      version: 1,
      nodes: [
        {
          id: "1",
          type: "text",
          props: { text: "hi" },
          styles: { fontSize: "16px" },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.version).toBe(2);
    expect(result.document.nodes[0]?.styles).toEqual({
      base: { fontSize: "16px" },
    });
  });

  it("passes through a current v2 document", () => {
    const doc = toBlockDocument([
      {
        id: "1",
        type: "text",
        props: { text: "hi" },
        styles: { base: { color: "red" }, sm: { color: "blue" } },
      },
    ]);
    expect(migrateBlockDocument(doc)).toEqual({ ok: true, document: doc });
  });

  it("returns empty for null and garbage", () => {
    expect(nodesFromStored(null)).toEqual([]);
    expect(nodesFromStored(undefined)).toEqual([]);
    expect(nodesFromStored({})).toEqual([]);
    expect(nodesFromStored("nope")).toEqual([]);
  });

  it("refuses a future version even when nodes are missing (audit B6)", () => {
    const result = migrateBlockDocument({ version: 99, tree: [] });
    expect(result).toEqual({
      ok: false,
      reason: "unsupported-version",
      version: 99,
    });
    expect(refuseWriteIfUnsupported({ version: 99, tree: [] })).toContain(
      "newer editor",
    );
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
