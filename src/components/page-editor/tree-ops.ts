import type { BlockNode } from "@/db/schema";

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

/** Move node to a new parent (null = root) at index. */
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

  const without = removeNodeById(nodes, nodeId);
  return insertChild(without, newParentId, node, index);
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
