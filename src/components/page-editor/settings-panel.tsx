"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BlockNode } from "@/db/schema";

type SettingsPanelProps = {
  selected: BlockNode | null;
  onChange: (props: Record<string, unknown>) => void;
  onDelete: () => void;
};

export function SettingsPanel({
  selected,
  onChange,
  onDelete,
}: SettingsPanelProps) {
  if (!selected) {
    return (
      <p className="p-3 text-sm text-muted-foreground">
        Select a block to edit settings.
      </p>
    );
  }

  const props = selected.props;

  function setProp(key: string, value: unknown) {
    onChange({ ...props, [key]: value });
  }

  return (
    <div className="grid gap-3 p-3">
      <p className="text-xs text-muted-foreground">
        Type: <span className="font-mono text-foreground">{selected.type}</span>
      </p>

      {(selected.type === "heading" ||
        selected.type === "text" ||
        selected.type === "button") && (
        <div className="grid gap-1.5">
          <Label htmlFor="prop-text" className="text-xs">
            Text
          </Label>
          <Input
            id="prop-text"
            value={String(props.text ?? "")}
            onChange={(event) => setProp("text", event.target.value)}
          />
        </div>
      )}

      {selected.type === "heading" && (
        <div className="grid gap-1.5">
          <Label htmlFor="prop-level" className="text-xs">
            Level
          </Label>
          <select
            id="prop-level"
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            value={String(props.level ?? 2)}
            onChange={(event) => setProp("level", Number(event.target.value))}
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
            <option value={4}>H4</option>
          </select>
        </div>
      )}

      {selected.type === "button" && (
        <div className="grid gap-1.5">
          <Label htmlFor="prop-href" className="text-xs">
            Link href
          </Label>
          <Input
            id="prop-href"
            value={String(props.href ?? "")}
            onChange={(event) => setProp("href", event.target.value)}
          />
        </div>
      )}

      {selected.type === "image" && (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="prop-src" className="text-xs">
              Image URL
            </Label>
            <Input
              id="prop-src"
              value={String(props.src ?? "")}
              onChange={(event) => setProp("src", event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="prop-alt" className="text-xs">
              Alt text
            </Label>
            <Input
              id="prop-alt"
              value={String(props.alt ?? "")}
              onChange={(event) => setProp("alt", event.target.value)}
            />
          </div>
        </>
      )}

      <button
        type="button"
        className="mt-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
        onClick={onDelete}
      >
        Delete block
      </button>
    </div>
  );
}
