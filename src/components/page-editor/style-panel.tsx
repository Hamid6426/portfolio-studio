"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  AlignCenterIcon,
  AlignHorizontalJustifyCenterIcon,
  AlignHorizontalJustifyEndIcon,
  AlignHorizontalJustifyStartIcon,
  AlignHorizontalSpaceBetweenIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignVerticalJustifyCenterIcon,
  AlignVerticalJustifyEndIcon,
  AlignVerticalJustifyStartIcon,
  AlignVerticalSpaceAroundIcon,
  ArrowDownIcon,
  ArrowRightIcon,
} from "lucide-react";

import { findParent } from "@/components/page-editor/tree-ops";
import { Input } from "@/components/ui/input";
import type { BlockNode } from "@/db/schema";
import {
  pruneResponsiveStyles,
  type ResponsiveStyles,
  type StyleSliceKey,
} from "@/lib/blocks/styles";
import { cn } from "@/lib/utils";

type StylePanelProps = {
  content: BlockNode[];
  selected: BlockNode | null;
  onChange: (styles: ResponsiveStyles) => void;
};

function parseSides(value: string | undefined): [string, string, string, string] {
  if (!value?.trim()) return ["", "", "", ""];
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) {
    const v = parts[0]!;
    return [v, v, v, v];
  }
  if (parts.length === 2) {
    return [parts[0]!, parts[1]!, parts[0]!, parts[1]!];
  }
  if (parts.length === 3) {
    return [parts[0]!, parts[1]!, parts[2]!, parts[1]!];
  }
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

function joinSides(top: string, right: string, bottom: string, left: string) {
  if (!top && !right && !bottom && !left) return "";
  if (top === right && right === bottom && bottom === left) return top;
  if (top === bottom && right === left) return `${top} ${right}`;
  if (right === left) return `${top} ${right} ${bottom}`;
  return `${top} ${right} ${bottom} ${left}`;
}

/** Append `px` when the user enters a bare number (e.g. `16` → `16px`). */
function commitDimValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
  return trimmed;
}

function isFlexContainerStyles(styles: Record<string, string> | undefined): boolean {
  if (!styles) return false;
  return (
    styles.display === "flex" ||
    Boolean(
      styles.flexDirection ||
        styles.flexWrap ||
        styles.gap ||
        styles.justifyContent ||
        styles.alignItems,
    )
  );
}

/** Only a full 6-digit hex is safe to bind to `<input type="color">`. */
function toSolidHex(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-border px-3 py-3 last:border-b-0">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[52px_1fr] items-center gap-2">
      <span className="truncate text-[11px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function CompactInput({
  value,
  placeholder,
  onChange,
  onCommit,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Input
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={
        onCommit
          ? (event) => onCommit(event.target.value)
          : undefined
      }
      className={cn(
        "h-7 rounded-md px-2 text-xs shadow-none md:text-xs",
        className,
      )}
    />
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label?: string; icon?: ReactNode; title: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-7 overflow-hidden rounded-md border border-input bg-input/30">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-label={option.title}
            aria-pressed={active}
            className={cn(
              "flex flex-1 items-center justify-center px-1.5 text-[11px] transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(active ? "" : option.value)}
          >
            {option.icon ?? option.label}
          </button>
        );
      })}
    </div>
  );
}

function SlicePicker({
  value,
  onChange,
}: {
  value: StyleSliceKey;
  onChange: (value: StyleSliceKey) => void;
}) {
  const options: { value: StyleSliceKey; label: string; title: string }[] = [
    { value: "base", label: "Base", title: "Base styles" },
    { value: "sm", label: "SM", title: "Small container (≥640px)" },
    { value: "md", label: "MD", title: "Medium container (≥768px)" },
    { value: "lg", label: "LG", title: "Large container (≥1024px)" },
    { value: "hover", label: "Hover", title: "Hover state" },
  ];
  return (
    <div className="flex h-7 overflow-hidden rounded-md border border-input bg-input/30">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-label={option.title}
            aria-pressed={active}
            className={cn(
              "flex flex-1 items-center justify-center px-1 text-[10px] transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SideInputs({
  values,
  onChange,
  onCommit,
  labels,
}: {
  values: [string, string, string, string];
  onChange: (next: [string, string, string, string]) => void;
  onCommit?: (next: [string, string, string, string]) => void;
  labels: [string, string, string, string];
}) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {values.map((value, index) => (
        <CompactInput
          key={labels[index]}
          aria-label={labels[index]}
          value={value}
          placeholder="0"
          onChange={(next) => {
            const copy = [...values] as [string, string, string, string];
            copy[index] = next;
            onChange(copy);
          }}
          onCommit={
            onCommit
              ? (next) => {
                  const copy = [...values] as [string, string, string, string];
                  copy[index] = next;
                  onCommit(copy);
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

function DimInput({
  label,
  value,
  placeholder,
  onChange,
  onCommit,
  "aria-label": ariaLabel,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  "aria-label"?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="w-4 shrink-0 text-[11px] text-muted-foreground">
        {label}
      </span>
      <CompactInput
        aria-label={ariaLabel ?? label}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onCommit={onCommit}
      />
    </div>
  );
}

function ColorField({
  swatchLabel,
  inputLabel,
  value,
  placeholder,
  onChange,
}: {
  swatchLabel: string;
  inputLabel: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const solidHex = toSolidHex(value);

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={swatchLabel}
        title={solidHex ? solidHex : "Mixed or unset color"}
        className={cn(
          "relative size-7 shrink-0 overflow-hidden rounded-md border border-input",
          !solidHex &&
            "bg-[repeating-conic-gradient(#d4d4d8_0%_25%,transparent_0%_50%)] bg-size-[8px_8px] bg-center",
        )}
        style={solidHex ? { backgroundColor: solidHex } : undefined}
        onClick={() => pickerRef.current?.click()}
      />
      <input
        ref={pickerRef}
        type="color"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        value={solidHex ?? "#808080"}
        onChange={(event) => onChange(event.target.value)}
      />
      <CompactInput
        aria-label={inputLabel}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  );
}

export function StylePanel({ content, selected, onChange }: StylePanelProps) {
  const [slice, setSlice] = useState<StyleSliceKey>("base");

  if (!selected) {
    return (
      <p className="p-3 text-sm text-muted-foreground">
        Select a block to edit styles.
      </p>
    );
  }

  const responsiveStyles = selected.styles ?? {};
  const styles = responsiveStyles[slice] ?? {};
  const isFlexContainer = isFlexContainerStyles(responsiveStyles.base);
  const parentLoc = findParent(content, selected.id);
  const isFlexItem = isFlexContainerStyles(parentLoc?.parent?.styles?.base);

  function commitSlice(nextSliceMap: Record<string, string>) {
    const full: ResponsiveStyles = { ...responsiveStyles };
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(nextSliceMap)) {
      if (value.trim()) cleaned[key] = value;
    }
    if (Object.keys(cleaned).length === 0) {
      delete full[slice];
    } else {
      full[slice] = cleaned;
    }
    onChange(pruneResponsiveStyles(full) ?? {});
  }

  function setField(key: string, value: string) {
    const next = { ...styles };
    if (!value.trim()) delete next[key];
    else next[key] = value;
    commitSlice(next);
  }

  function setBackground(value: string) {
    const next = { ...styles };
    if (!value.trim()) delete next.background;
    else next.background = value;
    delete next.backgroundColor;
    commitSlice(next);
  }

  function setDimField(key: string, value: string) {
    setField(key, commitDimValue(value));
  }

  function commitSides(
    key: "padding" | "margin",
    sides: [string, string, string, string],
  ) {
    setField(
      key,
      joinSides(
        commitDimValue(sides[0]),
        commitDimValue(sides[1]),
        commitDimValue(sides[2]),
        commitDimValue(sides[3]),
      ),
    );
  }

  function setSides(
    key: "padding" | "margin",
    sides: [string, string, string, string],
  ) {
    setField(key, joinSides(...sides));
  }

  const padding = parseSides(styles.padding);
  const margin = parseSides(styles.margin);

  return (
    <div className="pb-1">
      <Section title="Breakpoint">
        <SlicePicker value={slice} onChange={setSlice} />
      </Section>

      <Section title="Layout">
        <div className="grid grid-cols-2 gap-2">
          <DimInput
            label="W"
            value={styles.width ?? ""}
            placeholder="Auto"
            onChange={(value) => setField("width", value)}
            onCommit={(value) => setDimField("width", value)}
          />
          <DimInput
            label="H"
            value={styles.height ?? ""}
            placeholder="Auto"
            onChange={(value) => setField("height", value)}
            onCommit={(value) => setDimField("height", value)}
          />
        </div>
        <FieldRow label="Max W">
          <CompactInput
            aria-label="Max width"
            value={styles.maxWidth ?? ""}
            placeholder="None"
            onChange={(value) => setField("maxWidth", value)}
            onCommit={(value) => setDimField("maxWidth", value)}
          />
        </FieldRow>
        <FieldRow label="Display">
          <Segmented
            value={styles.display ?? ""}
            onChange={(value) => setField("display", value)}
            options={[
              { value: "block", label: "Block", title: "Block" },
              { value: "flex", label: "Flex", title: "Flex" },
              { value: "none", label: "None", title: "None" },
            ]}
          />
        </FieldRow>
        {isFlexContainer && (
          <>
            <FieldRow label="Dir">
              <Segmented
                value={styles.flexDirection ?? ""}
                onChange={(value) => setField("flexDirection", value)}
                options={[
                  {
                    value: "row",
                    title: "Row",
                    icon: <ArrowRightIcon className="size-3.5" />,
                  },
                  {
                    value: "column",
                    title: "Column",
                    icon: <ArrowDownIcon className="size-3.5" />,
                  },
                ]}
              />
            </FieldRow>
            <FieldRow label="Wrap">
              <Segmented
                value={styles.flexWrap ?? ""}
                onChange={(value) => setField("flexWrap", value)}
                options={[
                  { value: "nowrap", label: "No", title: "No wrap" },
                  { value: "wrap", label: "Yes", title: "Wrap" },
                ]}
              />
            </FieldRow>
            <FieldRow label="Justify">
              <Segmented
                value={styles.justifyContent ?? ""}
                onChange={(value) => setField("justifyContent", value)}
                options={[
                  {
                    value: "flex-start",
                    title: "Start",
                    icon: <AlignHorizontalJustifyStartIcon className="size-3.5" />,
                  },
                  {
                    value: "center",
                    title: "Center",
                    icon: <AlignHorizontalJustifyCenterIcon className="size-3.5" />,
                  },
                  {
                    value: "flex-end",
                    title: "End",
                    icon: <AlignHorizontalJustifyEndIcon className="size-3.5" />,
                  },
                  {
                    value: "space-between",
                    title: "Space between",
                    icon: <AlignHorizontalSpaceBetweenIcon className="size-3.5" />,
                  },
                ]}
              />
            </FieldRow>
            <FieldRow label="Align">
              <Segmented
                value={styles.alignItems ?? ""}
                onChange={(value) => setField("alignItems", value)}
                options={[
                  {
                    value: "flex-start",
                    title: "Start",
                    icon: <AlignVerticalJustifyStartIcon className="size-3.5" />,
                  },
                  {
                    value: "center",
                    title: "Center",
                    icon: <AlignVerticalJustifyCenterIcon className="size-3.5" />,
                  },
                  {
                    value: "flex-end",
                    title: "End",
                    icon: <AlignVerticalJustifyEndIcon className="size-3.5" />,
                  },
                  {
                    value: "stretch",
                    title: "Stretch",
                    icon: <AlignVerticalSpaceAroundIcon className="size-3.5" />,
                  },
                ]}
              />
            </FieldRow>
            <FieldRow label="Gap">
              <CompactInput
                aria-label="Gap"
                value={styles.gap ?? ""}
                placeholder="0"
                onChange={(value) => setField("gap", value)}
                onCommit={(value) => setDimField("gap", value)}
              />
            </FieldRow>
          </>
        )}
        {(isFlexContainer || isFlexItem) && (
          <>
            <FieldRow label="Flex">
              <CompactInput
                aria-label="Flex"
                value={styles.flex ?? ""}
                placeholder="1 1 auto"
                onChange={(value) => setField("flex", value)}
              />
            </FieldRow>
            <FieldRow label="Min W">
              <CompactInput
                aria-label="Min width"
                value={styles.minWidth ?? ""}
                placeholder="0"
                onChange={(value) => setField("minWidth", value)}
                onCommit={(value) => setDimField("minWidth", value)}
              />
            </FieldRow>
          </>
        )}
      </Section>

      <Section title="Spacing">
        <FieldRow label="Pad">
          <div className="grid gap-1">
            <SideInputs
              values={padding}
              labels={["Padding top", "Padding right", "Padding bottom", "Padding left"]}
              onChange={(next) => setSides("padding", next)}
              onCommit={(next) => commitSides("padding", next)}
            />
            <div className="grid grid-cols-4 gap-1 text-center text-[9px] text-muted-foreground">
              <span>T</span>
              <span>R</span>
              <span>B</span>
              <span>L</span>
            </div>
          </div>
        </FieldRow>
        <FieldRow label="Mar">
          <div className="grid gap-1">
            <SideInputs
              values={margin}
              labels={["Margin top", "Margin right", "Margin bottom", "Margin left"]}
              onChange={(next) => setSides("margin", next)}
              onCommit={(next) => commitSides("margin", next)}
            />
            <div className="grid grid-cols-4 gap-1 text-center text-[9px] text-muted-foreground">
              <span>T</span>
              <span>R</span>
              <span>B</span>
              <span>L</span>
            </div>
          </div>
        </FieldRow>
      </Section>

      <Section title="Typography">
        <div className="grid grid-cols-2 gap-2">
          <DimInput
            label="Aa"
            aria-label="Font size"
            value={styles.fontSize ?? ""}
            placeholder="16px"
            onChange={(value) => setField("fontSize", value)}
            onCommit={(value) => setDimField("fontSize", value)}
          />
          <DimInput
            label="Wt"
            aria-label="Font weight"
            value={styles.fontWeight ?? ""}
            placeholder="400"
            onChange={(value) => setField("fontWeight", value)}
          />
        </div>
        <FieldRow label="Line">
          <CompactInput
            aria-label="Line height"
            value={styles.lineHeight ?? ""}
            placeholder="1.6"
            onChange={(value) => setField("lineHeight", value)}
          />
        </FieldRow>
        <FieldRow label="Decor">
          <Segmented
            value={styles.textDecoration ?? ""}
            onChange={(value) => setField("textDecoration", value)}
            options={[
              { value: "none", label: "None", title: "None" },
              { value: "underline", label: "Under", title: "Underline" },
              { value: "line-through", label: "Strike", title: "Line through" },
            ]}
          />
        </FieldRow>
        <FieldRow label="Align">
          <Segmented
            value={styles.textAlign ?? ""}
            onChange={(value) => setField("textAlign", value)}
            options={[
              {
                value: "left",
                title: "Left",
                icon: <AlignLeftIcon className="size-3.5" />,
              },
              {
                value: "center",
                title: "Center",
                icon: <AlignCenterIcon className="size-3.5" />,
              },
              {
                value: "right",
                title: "Right",
                icon: <AlignRightIcon className="size-3.5" />,
              },
            ]}
          />
        </FieldRow>
        <FieldRow label="Color">
          <ColorField
            swatchLabel="Text color swatch"
            inputLabel="Text color"
            value={styles.color ?? ""}
            placeholder="#fff or rgba(...)"
            onChange={(value) => setField("color", value)}
          />
        </FieldRow>
      </Section>

      <Section title="Appearance">
        <FieldRow label="Fill">
          <ColorField
            swatchLabel="Background swatch"
            inputLabel="Background"
            value={styles.background ?? styles.backgroundColor ?? ""}
            placeholder="transparent or rgba(...)"
            onChange={setBackground}
          />
        </FieldRow>
        <FieldRow label="Border">
          <CompactInput
            aria-label="Border"
            value={styles.border ?? ""}
            placeholder="1px solid #ccc"
            onChange={(value) => setField("border", value)}
          />
        </FieldRow>
        <FieldRow label="Top">
          <CompactInput
            aria-label="Border top"
            value={styles.borderTop ?? ""}
            placeholder="1px solid rgba(...)"
            onChange={(value) => setField("borderTop", value)}
          />
        </FieldRow>
        <FieldRow label="Radius">
          <CompactInput
            aria-label="Border radius"
            value={styles.borderRadius ?? ""}
            placeholder="0"
            onChange={(value) => setField("borderRadius", value)}
            onCommit={(value) => setDimField("borderRadius", value)}
          />
        </FieldRow>
        <FieldRow label="Overflow">
          <Segmented
            value={styles.overflow ?? ""}
            onChange={(value) => setField("overflow", value)}
            options={[
              { value: "visible", label: "Show", title: "Visible" },
              { value: "hidden", label: "Hide", title: "Hidden" },
              { value: "auto", label: "Auto", title: "Auto" },
              { value: "scroll", label: "Scroll", title: "Scroll" },
            ]}
          />
        </FieldRow>
      </Section>
    </div>
  );
}
