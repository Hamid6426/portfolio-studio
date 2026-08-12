import type { BlockNode } from "@/db/schema.types";

export function findNode(
  nodes: BlockNode[],
  id: string,
): BlockNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(
  nodes: BlockNode[],
  id: string,
  parent: BlockNode | null = null,
): { parent: BlockNode | null; index: number; siblings: BlockNode[] } | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    if (node.id === id) {
      return { parent, index, siblings: nodes };
    }
    if (node.children) {
      const found = findParent(node.children, id, node);
      if (found) return found;
    }
  }
  return null;
}

export function updateNodeById(
  nodes: BlockNode[],
  id: string,
  updater: (node: BlockNode) => BlockNode,
): BlockNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    if (!node.children) return node;
    return {
      ...node,
      children: updateNodeById(node.children, id, updater),
    };
  });
}

export function removeNodeById(
  nodes: BlockNode[],
  id: string,
): BlockNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.children
        ? { ...node, children: removeNodeById(node.children, id) }
        : node,
    );
}

export function insertChild(
  nodes: BlockNode[],
  parentId: string | null,
  child: BlockNode,
  index?: number,
): BlockNode[] {
  if (parentId === null) {
    const next = [...nodes];
    const at = index ?? next.length;
    next.splice(at, 0, child);
    return next;
  }

  return nodes.map((node) => {
    if (node.id === parentId) {
      const children = [...(node.children ?? [])];
      const at = index ?? children.length;
      children.splice(at, 0, child);
      return { ...node, children };
    }
    if (!node.children) return node;
    return {
      ...node,
      children: insertChild(node.children, parentId, child, index),
    };
  });
}

/** True when `candidateId` is `nodeId` itself or lives somewhere inside it. */
export function containsNode(
  nodes: BlockNode[],
  nodeId: string,
  candidateId: string,
): boolean {
  const node = findNode(nodes, nodeId);
  if (!node) return false;
  return findNode([node], candidateId) !== null;
}

/**
 * Move a node under `newParentId` (null = root).
 *
 * `index` is the destination slot measured **after** the node has been removed
 * from its current position — i.e. the slot the drop indicator points at.
 * Callers must compute it against the destination sibling list with the moved
 * node filtered out, otherwise downward moves land one slot short.
 *
 * Returns `nodes` unchanged for impossible or no-op moves so callers can skip
 * pushing a history entry.
 */
export function moveNode(
  nodes: BlockNode[],
  nodeId: string,
  newParentId: string | null,
  index: number,
): BlockNode[] {
  const located = findParent(nodes, nodeId);
  if (!located) return nodes;

  const node = located.siblings[located.index];
  if (!node) return nodes;

  // Prevent nesting into self/descendant
  if (newParentId === nodeId) return nodes;
  if (newParentId && findNode([node], newParentId)) return nodes;

  // The destination must exist and be able to hold children.
  if (newParentId) {
    const parent = findNode(nodes, newParentId);
    if (!parent?.children) return nodes;
  }

  const currentParentId = located.parent?.id ?? null;
  const at = Math.max(0, index);

  // Dropping back into the slot it already occupies.
  if (currentParentId === newParentId && at === located.index) return nodes;

  const without = removeNodeById(nodes, nodeId);
  return insertChild(without, newParentId, node, at);
}

/** Move one slot among siblings; no-op at list boundaries. */
export function moveSibling(
  nodes: BlockNode[],
  nodeId: string,
  direction: -1 | 1,
): BlockNode[] {
  const located = findParent(nodes, nodeId);
  if (!located) return nodes;

  const targetIndex = located.index + direction;
  if (targetIndex < 0 || targetIndex >= located.siblings.length) return nodes;

  const parentId = located.parent?.id ?? null;
  const index = direction === -1 ? located.index - 1 : located.index + 1;
  return moveNode(nodes, nodeId, parentId, index);
}

/** Lift a node out of its parent, placing it immediately after the parent. */
export function outdentNode(nodes: BlockNode[], nodeId: string): BlockNode[] {
  const located = findParent(nodes, nodeId);
  if (!located?.parent) return nodes;

  const parentLocated = findParent(nodes, located.parent.id);
  if (!parentLocated) return nodes;

  const grandParentId = parentLocated.parent?.id ?? null;
  return moveNode(nodes, nodeId, grandParentId, parentLocated.index + 1);
}

/** Nest a node under its previous sibling when that sibling accepts children. */
export function indentNode(nodes: BlockNode[], nodeId: string): BlockNode[] {
  const located = findParent(nodes, nodeId);
  if (!located || located.index === 0) return nodes;

  const prevSibling = located.siblings[located.index - 1]!;
  if (prevSibling.children === undefined) return nodes;

  return moveNode(
    nodes,
    nodeId,
    prevSibling.id,
    prevSibling.children.length,
  );
}

export function flattenTree(
  nodes: BlockNode[],
  depth = 0,
): { node: BlockNode; depth: number }[] {
  const result: { node: BlockNode; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}
