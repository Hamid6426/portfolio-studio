"use client";

import type { ReactNode } from "react";
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

import { Input } from "@/components/ui/input";
import type { BlockNode } from "@/db/schema";
import { cn } from "@/lib/utils";

type StylePanelProps = {
  selected: BlockNode | null;
  onChange: (styles: Record<string, string>) => void;
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
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Input
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
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
            onClick={() => onChange(option.value)}
          >
            {option.icon ?? option.label}
          </button>
        );
      })}
    </div>
  );
}

function SideInputs({
  values,
  onChange,
  labels,
}: {
  values: [string, string, string, string];
  onChange: (next: [string, string, string, string]) => void;
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
  "aria-label": ariaLabel,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
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
      />
    </div>
  );
}

export function StylePanel({ selected, onChange }: StylePanelProps) {
  if (!selected) {
    return (
      <p className="p-3 text-sm text-muted-foreground">
        Select a block to edit styles.
      </p>
    );
  }

  const styles = selected.styles ?? {};
  const isFlex =
    styles.display === "flex" ||
    Boolean(
      styles.flexDirection ||
        styles.gap ||
        styles.justifyContent ||
        styles.alignItems,
    );

  function setField(key: string, value: string) {
    const next = { ...styles };
    if (!value.trim()) delete next[key];
    else next[key] = value;
    onChange(next);
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
      <Section title="Layout">
        <div className="grid grid-cols-2 gap-2">
          <DimInput
            label="W"
            value={styles.width ?? ""}
            placeholder="Auto"
            onChange={(value) => setField("width", value)}
          />
          <DimInput
            label="H"
            value={styles.height ?? ""}
            placeholder="Auto"
            onChange={(value) => setField("height", value)}
          />
        </div>
        <FieldRow label="Max W">
          <CompactInput
            aria-label="Max width"
            value={styles.maxWidth ?? ""}
            placeholder="None"
            onChange={(value) => setField("maxWidth", value)}
          />
        </FieldRow>
        <FieldRow label="Display">
          <Segmented
            value={styles.display ?? ""}
            onChange={(value) => setField("display", value)}
            options={[
              { value: "block", label: "Block", title: "Block" },
              { value: "flex", label: "Flex", title: "Flex" },
              { value: "grid", label: "Grid", title: "Grid" },
              { value: "none", label: "None", title: "None" },
            ]}
          />
        </FieldRow>
        {isFlex && (
          <>
            <FieldRow label="Dir">
              <Segmented
                value={styles.flexDirection ?? "column"}
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
          />
          <DimInput
            label="Wt"
            aria-label="Font weight"
            value={styles.fontWeight ?? ""}
            placeholder="400"
            onChange={(value) => setField("fontWeight", value)}
          />
        </div>
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
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              aria-label="Text color swatch"
              className="size-7 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              value={
                styles.color?.startsWith("#") && styles.color.length >= 4
                  ? styles.color.slice(0, 7)
                  : "#ffffff"
              }
              onChange={(event) => setField("color", event.target.value)}
            />
            <CompactInput
              aria-label="Text color"
              value={styles.color ?? ""}
              placeholder="#fff"
              onChange={(value) => setField("color", value)}
            />
          </div>
        </FieldRow>
      </Section>

      <Section title="Appearance">
        <FieldRow label="Fill">
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              aria-label="Background swatch"
              className="size-7 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              value={
                styles.background?.startsWith("#") && styles.background.length >= 4
                  ? styles.background.slice(0, 7)
                  : "#000000"
              }
              onChange={(event) => setField("background", event.target.value)}
            />
            <CompactInput
              aria-label="Background"
              value={styles.background ?? ""}
              placeholder="transparent"
              onChange={(value) => setField("background", value)}
            />
          </div>
        </FieldRow>
        <FieldRow label="Radius">
          <CompactInput
            aria-label="Border radius"
            value={styles.borderRadius ?? ""}
            placeholder="0"
            onChange={(value) => setField("borderRadius", value)}
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
