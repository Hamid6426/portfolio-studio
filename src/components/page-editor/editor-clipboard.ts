import type { BlockNode } from "@/db/schema.types";
import { isResponsiveStyles } from "@/lib/blocks/styles";

/** Marker written to the system clipboard so paste can recognise our payload. */
export const EDITOR_CLIPBOARD_MIME_HINT = "application/x-portfolio-studio-blocks";

type ClipboardPayload = {
  v: 1;
  kind: "portfolio-studio-blocks";
  nodes: BlockNode[];
};

/** In-memory clipboard shared across page/block editors in this tab. */
let memoryNodes: BlockNode[] = [];

export function setEditorClipboard(nodes: BlockNode[]): void {
  memoryNodes = structuredClone(nodes);
}

export function getEditorClipboard(): BlockNode[] {
  return structuredClone(memoryNodes);
}

export function hasEditorClipboard(): boolean {
  return memoryNodes.length > 0;
}

export function clearEditorClipboard(): void {
  memoryNodes = [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBlockNode(value: unknown): value is BlockNode {
  if (!isPlainObject(value)) return false;
  if (typeof value.id !== "string" || !value.id) return false;
  if (typeof value.type !== "string" || !value.type) return false;
  if (!isPlainObject(value.props)) return false;
  if (value.styles !== undefined && !isResponsiveStyles(value.styles) && !isFlatStringMap(value.styles)) {
    return false;
  }
  if (value.children !== undefined) {
    if (!Array.isArray(value.children)) return false;
    if (!value.children.every(isBlockNode)) return false;
  }
  return true;
}

function isFlatStringMap(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

export function isClipboardPayload(value: unknown): value is ClipboardPayload {
  if (!isPlainObject(value)) return false;
  if (value.v !== 1) return false;
  if (value.kind !== "portfolio-studio-blocks") return false;
  if (!Array.isArray(value.nodes) || value.nodes.length === 0) return false;
  return value.nodes.every(isBlockNode);
}

export function serializeClipboard(nodes: BlockNode[]): string {
  const payload: ClipboardPayload = {
    v: 1,
    kind: "portfolio-studio-blocks",
    nodes: structuredClone(nodes),
  };
  return JSON.stringify(payload);
}

export function parseClipboardText(raw: string): BlockNode[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isClipboardPayload(parsed)) return null;
    return structuredClone(parsed.nodes);
  } catch {
    return null;
  }
}

/** Best-effort write to the OS clipboard (ignored when the API is unavailable). */
export async function writeSystemClipboard(nodes: BlockNode[]): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return;
  }
  try {
    await navigator.clipboard.writeText(serializeClipboard(nodes));
  } catch {
    // Permission denied or insecure context — memory clipboard still works.
  }
}

/** Best-effort read from the OS clipboard. */
export async function readSystemClipboard(): Promise<BlockNode[] | null> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    return null;
  }
  try {
    const text = await navigator.clipboard.readText();
    return parseClipboardText(text);
  } catch {
    return null;
  }
}
