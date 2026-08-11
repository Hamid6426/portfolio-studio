"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BlockNode } from "@/db/schema";

const STYLE_FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: "width", label: "Width", placeholder: "100%" },
  { key: "maxWidth", label: "Max width" },
  { key: "padding", label: "Padding", placeholder: "16px" },
  { key: "margin", label: "Margin" },
  { key: "display", label: "Display", placeholder: "flex" },
  { key: "flexDirection", label: "Flex direction", placeholder: "column" },
  { key: "gap", label: "Gap", placeholder: "16px" },
  { key: "justifyContent", label: "Justify" },
  { key: "alignItems", label: "Align" },
  { key: "color", label: "Color", placeholder: "#fff" },
  { key: "background", label: "Background" },
  { key: "fontSize", label: "Font size", placeholder: "16px" },
  { key: "fontWeight", label: "Font weight" },
  { key: "textAlign", label: "Text align" },
  { key: "borderRadius", label: "Radius" },
];

type StylePanelProps = {
  selected: BlockNode | null;
  onChange: (styles: Record<string, string>) => void;
};

export function StylePanel({ selected, onChange }: StylePanelProps) {
  if (!selected) {
    return (
      <p className="p-3 text-sm text-muted-foreground">
        Select a block to edit styles.
      </p>
    );
  }

  const styles = selected.styles ?? {};

  function setField(key: string, value: string) {
    const next = { ...styles };
    if (!value.trim()) delete next[key];
    else next[key] = value;
    onChange(next);
  }

  return (
    <div className="grid gap-3 p-3">
      {STYLE_FIELDS.map((field) => (
        <div key={field.key} className="grid gap-1.5">
          <Label htmlFor={`style-${field.key}`} className="text-xs">
            {field.label}
          </Label>
          <Input
            id={`style-${field.key}`}
            value={styles[field.key] ?? ""}
            placeholder={field.placeholder}
            onChange={(event) => setField(field.key, event.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
