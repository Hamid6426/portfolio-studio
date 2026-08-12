"use client";

import type { ReactNode } from "react";
import { Trash2Icon } from "lucide-react";

import { definitionFor } from "@/components/page-editor/block-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BlockNode } from "@/db/schema";
import { cn } from "@/lib/utils";

type SettingsPanelProps = {
  selected: BlockNode | null;
  onChange: (props: Record<string, unknown>) => void;
  onDelete: () => void;
};

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
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[52px_1fr] items-center gap-2">
      <label
        htmlFor={htmlFor}
        className="truncate text-[11px] text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function CompactInput({
  id,
  value,
  onChange,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-7 rounded-md px-2 text-xs shadow-none md:text-xs",
        className,
      )}
    />
  );
}

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
  const label = definitionFor(selected.type)?.label ?? selected.type;

  function setProp(key: string, value: unknown) {
    onChange({ ...props, [key]: value });
  }

  const hasText =
    selected.type === "heading" ||
    selected.type === "text" ||
    selected.type === "button";

  return (
    <div>
      <Section title="Block">
        <FieldRow label="Type" htmlFor="prop-type">
          <span
            id="prop-type"
            className="truncate font-mono text-[11px] text-foreground"
          >
            {label}
          </span>
        </FieldRow>
      </Section>

      {hasText ? (
        <Section title="Content">
          <FieldRow label="Text" htmlFor="prop-text">
            <CompactInput
              id="prop-text"
              value={String(props.text ?? "")}
              onChange={(value) => setProp("text", value)}
            />
          </FieldRow>

          {selected.type === "heading" ? (
            <FieldRow label="Level" htmlFor="prop-level">
              <select
                id="prop-level"
                className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                value={String(props.level ?? 2)}
                onChange={(event) =>
                  setProp("level", Number(event.target.value))
                }
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
                <option value={4}>H4</option>
              </select>
            </FieldRow>
          ) : null}

          {selected.type === "button" ? (
            <FieldRow label="Href" htmlFor="prop-href">
              <CompactInput
                id="prop-href"
                value={String(props.href ?? "")}
                onChange={(value) => setProp("href", value)}
              />
            </FieldRow>
          ) : null}
        </Section>
      ) : null}

      {selected.type === "image" ? (
        <Section title="Image">
          <FieldRow label="Source" htmlFor="prop-src">
            <CompactInput
              id="prop-src"
              value={String(props.src ?? "")}
              onChange={(value) => setProp("src", value)}
            />
          </FieldRow>
          <FieldRow label="Alt" htmlFor="prop-alt">
            <CompactInput
              id="prop-alt"
              value={String(props.alt ?? "")}
              onChange={(value) => setProp("alt", value)}
            />
          </FieldRow>
        </Section>
      ) : null}

      {selected.type === "section" ? (
        <Section title="Accessibility">
          <FieldRow label="Aria" htmlFor="prop-aria-label">
            <CompactInput
              id="prop-aria-label"
              value={String(props.ariaLabel ?? "")}
              onChange={(value) => setProp("ariaLabel", value)}
            />
          </FieldRow>
        </Section>
      ) : null}

      <Section title="Danger zone">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={onDelete}
        >
          <Trash2Icon data-icon="inline-start" />
          Delete block
        </Button>
      </Section>
    </div>
  );
}
