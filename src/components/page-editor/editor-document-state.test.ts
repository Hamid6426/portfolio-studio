import { describe, expect, it } from "vitest";

import {
  MERGE_WINDOW_MS,
  editorReducer,
  initEditorDoc,
  treeKey,
  type EditorDoc,
} from "@/components/page-editor/editor-document-state";
import type { BlockNode } from "@/db/schema.types";

function node(id: string, text: string): BlockNode {
  return { id, type: "text", props: { text } };
}

function applyText(
  state: EditorDoc,
  text: string,
  now: number,
): EditorDoc {
  return editorReducer(state, {
    type: "apply",
    mergeKey: "n1:props",
    now,
    transform: () => [node("n1", text)],
  });
}

describe("editorReducer mergeKey", () => {
  it("clears future on merge after undo so redo cannot resurrect a divergent tree", () => {
    let state = initEditorDoc([node("n1", "a")]);

    state = applyText(state, "ab", 1_000);
    state = applyText(state, "abc", 1_000 + MERGE_WINDOW_MS - 1);
    expect(state.present[0]?.props.text).toBe("abc");
    expect(state.past).toHaveLength(1);

    state = editorReducer(state, { type: "undo" });
    expect(state.present[0]?.props.text).toBe("a");
    expect(state.future).toHaveLength(1);
    expect(state.lastMergeKey).toBeNull();

    // Retype inside the merge window with the same key — must push a new past
    // entry (merge key was reset) OR if somehow merging, must clear future.
    state = applyText(state, "ax", 1_000 + MERGE_WINDOW_MS + 50);
    expect(state.present[0]?.props.text).toBe("ax");
    expect(state.future).toHaveLength(0);

    state = editorReducer(state, { type: "redo" });
    // Nothing to redo — future was cleared.
    expect(state.present[0]?.props.text).toBe("ax");
    expect(treeKey(state.present)).toBe(treeKey([node("n1", "ax")]));
  });

  it("clears future when a merge would otherwise leave a stale redo stack", () => {
    let state = initEditorDoc([node("n1", "a")]);
    state = applyText(state, "ab", 1_000);
    state = editorReducer(state, { type: "undo" });
    expect(state.future).toHaveLength(1);

    // Force-merge by restoring the merge key (simulates the pre-fix bug path).
    state = {
      ...state,
      lastMergeKey: "n1:props",
      lastMergeAt: 2_000,
    };
    state = applyText(state, "az", 2_000 + 10);
    expect(state.present[0]?.props.text).toBe("az");
    expect(state.future).toHaveLength(0);
  });
});
