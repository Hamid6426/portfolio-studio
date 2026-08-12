import type { BlockNode } from "@/db/schema.types";

export const HISTORY_LIMIT = 100;
export const MERGE_WINDOW_MS = 500;

export function treeKey(nodes: BlockNode[]): string {
  return JSON.stringify(nodes);
}

export type EditorDoc = {
  past: BlockNode[][];
  present: BlockNode[];
  future: BlockNode[][];
  /** Content we believe the server currently holds. `dirty` is measured here. */
  baseline: BlockNode[];
  /** Serialized form of the last server payload we reacted to. */
  serverKey: string;
  /** The server moved on while we had unsaved edits. */
  conflict: boolean;
  lastMergeKey: string | null;
  lastMergeAt: number;
};

export type EditorAction =
  | {
      type: "apply";
      transform: (nodes: BlockNode[]) => BlockNode[];
      mergeKey?: string;
      /** Injectable clock for tests. */
      now?: number;
    }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "saved"; content: BlockNode[] }
  | { type: "load"; content: BlockNode[] }
  | { type: "sync"; content: BlockNode[]; key: string };

export function initEditorDoc(content: BlockNode[]): EditorDoc {
  return {
    past: [],
    present: content,
    future: [],
    baseline: content,
    serverKey: treeKey(content),
    conflict: false,
    lastMergeKey: null,
    lastMergeAt: 0,
  };
}

export function editorReducer(
  state: EditorDoc,
  action: EditorAction,
): EditorDoc {
  switch (action.type) {
    case "apply": {
      const present = action.transform(state.present);
      // Tree ops return the same reference for impossible/no-op edits.
      if (present === state.present) return state;

      const now = action.now ?? Date.now();
      const merge =
        action.mergeKey !== undefined &&
        action.mergeKey === state.lastMergeKey &&
        now - state.lastMergeAt < MERGE_WINDOW_MS;

      if (merge) {
        return {
          ...state,
          present,
          // Merged typing must clear redo stack — otherwise undo → retype → redo
          // lands on a tree that never followed from the current present.
          future: [],
          lastMergeAt: now,
        };
      }

      return {
        ...state,
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present,
        future: [],
        lastMergeKey: action.mergeKey ?? null,
        lastMergeAt: action.mergeKey !== undefined ? now : 0,
      };
    }

    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
        lastMergeKey: null,
        lastMergeAt: 0,
      };
    }

    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: state.future.slice(1),
        lastMergeKey: null,
        lastMergeAt: 0,
      };
    }

    case "saved":
      return { ...state, baseline: action.content, conflict: false };

    case "load": {
      const key = treeKey(action.content);
      return {
        past: [],
        present: action.content,
        future: [],
        baseline: action.content,
        serverKey: key,
        conflict: false,
        lastMergeKey: null,
        lastMergeAt: 0,
      };
    }

    case "sync": {
      if (action.key === state.serverKey) return state;

      const baselineKey = treeKey(state.baseline);
      if (action.key === baselineKey) {
        return { ...state, serverKey: action.key, conflict: false };
      }

      if (treeKey(state.present) !== baselineKey) {
        return { ...state, serverKey: action.key, conflict: true };
      }

      return {
        past: [],
        present: action.content,
        future: [],
        baseline: action.content,
        serverKey: action.key,
        conflict: false,
        lastMergeKey: null,
        lastMergeAt: 0,
      };
    }

    default:
      return state;
  }
}
