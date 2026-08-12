import { describe, expect, it } from "vitest";

import {
  cloneNodeWithNewIds,
  duplicateNodeAfter,
  findNode,
  findParent,
  rangeSelectIds,
  removeNodesByIds,
  selectionRootIds,
} from "@/components/page-editor/tree-ops";
import type { BlockNode } from "@/db/schema.types";

function text(id: string, value: string): BlockNode {
  return { id, type: "text", props: { text: value } };
}

function section(id: string, children: BlockNode[]): BlockNode {
  return { id, type: "section", props: {}, children };
}

describe("cloneNodeWithNewIds", () => {
  it("assigns new ids to the whole subtree", () => {
    const root = section("s1", [text("t1", "hi")]);
    const clone = cloneNodeWithNewIds(root);
    expect(clone.id).not.toBe("s1");
    expect(clone.children?.[0]?.id).not.toBe("t1");
    expect(clone.children?.[0]?.props.text).toBe("hi");
  });
});

describe("duplicateNodeAfter", () => {
  it("inserts a clone immediately after the original at the root", () => {
    const tree = [text("a", "one"), text("b", "two")];
    const result = duplicateNodeAfter(tree, "a");
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(3);
    expect(result!.nodes[0]?.id).toBe("a");
    expect(result!.nodes[1]?.id).toBe(result!.duplicatedId);
    expect(result!.nodes[1]?.props.text).toBe("one");
    expect(result!.nodes[2]?.id).toBe("b");
  });

  it("duplicates nested nodes under the same parent", () => {
    const tree = [section("s", [text("t1", "x"), text("t2", "y")])];
    const result = duplicateNodeAfter(tree, "t1");
    expect(result).not.toBeNull();
    const parent = findNode(result!.nodes, "s");
    expect(parent?.children).toHaveLength(3);
    expect(parent?.children?.[0]?.id).toBe("t1");
    expect(parent?.children?.[1]?.id).toBe(result!.duplicatedId);
    expect(parent?.children?.[2]?.id).toBe("t2");
    expect(findParent(result!.nodes, result!.duplicatedId)?.parent?.id).toBe(
      "s",
    );
  });

  it("returns null for a missing id", () => {
    expect(duplicateNodeAfter([text("a", "x")], "missing")).toBeNull();
  });
});

describe("selectionRootIds", () => {
  it("drops descendants when an ancestor is also selected", () => {
    const tree = [section("s", [text("t1", "x"), text("t2", "y")])];
    expect(selectionRootIds(tree, ["s", "t1", "t2"])).toEqual(["s"]);
  });

  it("keeps document order for sibling roots", () => {
    const tree = [text("a", "1"), text("b", "2"), text("c", "3")];
    expect(selectionRootIds(tree, ["c", "a"])).toEqual(["a", "c"]);
  });
});

describe("rangeSelectIds", () => {
  it("selects an inclusive flatten-tree range", () => {
    const tree = [
      section("s", [text("t1", "x"), text("t2", "y")]),
      text("z", "z"),
    ];
    expect(rangeSelectIds(tree, "t1", "z")).toEqual(["t1", "t2", "z"]);
  });
});

describe("removeNodesByIds", () => {
  it("removes several roots at once", () => {
    const tree = [text("a", "1"), text("b", "2"), text("c", "3")];
    expect(
      removeNodesByIds(tree, new Set(["a", "c"])).map((n) => n.id),
    ).toEqual(["b"]);
  });
});
