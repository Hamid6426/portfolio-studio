import type { ReactNode } from "react";

import type { BlockNode } from "@/db/schema.types";
import {
  blockStyleClassName,
  buildTreeStylesheet,
  wrapFlatStyles,
  type ResponsiveStyles,
  type StylePropertyMap,
} from "@/lib/blocks/styles";
import { isExternalUrl, sanitizeUrl } from "@/lib/block-sanitize";
import { cn } from "@/lib/utils";

export type BlockType =
  | "section"
  | "container"
  | "heading"
  | "text"
  | "list"
  | "listItem"
  | "image"
  | "button"
  | "divider";

export type BlockDefinition = {
  type: BlockType;
  label: string;
  canHaveChildren: boolean;
  defaultProps: Record<string, unknown>;
  defaultStyles?: StylePropertyMap;
};

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "section",
    label: "Section",
    canHaveChildren: true,
    defaultProps: {},
    defaultStyles: {
      padding: "48px 24px",
      width: "100%",
    },
  },
  {
    type: "container",
    label: "Container",
    canHaveChildren: true,
    defaultProps: {},
    defaultStyles: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      maxWidth: "720px",
      margin: "0 auto",
      width: "100%",
    },
  },
  {
    type: "heading",
    label: "Heading",
    canHaveChildren: false,
    defaultProps: { text: "Heading", level: 2 },
    defaultStyles: {
      fontSize: "32px",
      fontWeight: "600",
      margin: "0",
    },
  },
  {
    type: "text",
    label: "Text",
    canHaveChildren: false,
    defaultProps: { text: "Add your text here." },
    defaultStyles: {
      fontSize: "16px",
      lineHeight: "1.6",
      margin: "0",
    },
  },
  {
    type: "list",
    label: "List",
    canHaveChildren: true,
    defaultProps: { ordered: false },
    defaultStyles: {
      margin: "0",
      padding: "0 0 0 1.25em",
      fontSize: "16px",
      lineHeight: "1.7",
      width: "100%",
    },
  },
  {
    type: "listItem",
    label: "List item",
    canHaveChildren: false,
    defaultProps: { text: "List item" },
    defaultStyles: {
      margin: "0 0 6px",
      padding: "0",
    },
  },
  {
    type: "image",
    label: "Image",
    canHaveChildren: false,
    defaultProps: {
      src: "",
      alt: "",
    },
    defaultStyles: {
      width: "100%",
      maxWidth: "100%",
      display: "block",
    },
  },
  {
    type: "button",
    label: "Button",
    canHaveChildren: false,
    defaultProps: { text: "Click me", href: "#" },
    defaultStyles: {
      display: "inline-flex",
      padding: "10px 16px",
      background: "#fff",
      color: "#000",
      borderRadius: "8px",
      textDecoration: "none",
      fontWeight: "500",
    },
  },
  {
    type: "divider",
    label: "Divider",
    canHaveChildren: false,
    defaultProps: {},
    defaultStyles: {
      border: "none",
      borderTop: "1px solid rgba(255,255,255,0.15)",
      margin: "24px 0",
      width: "100%",
    },
  },
];

export function createBlockNode(type: BlockType): BlockNode {
  const def = BLOCK_DEFINITIONS.find((item) => item.type === type);
  if (!def) {
    throw new Error(`Unknown block type: ${type}`);
  }

  const node: BlockNode = {
    id: crypto.randomUUID(),
    type: def.type,
    props: { ...def.defaultProps },
    styles: def.defaultStyles ? wrapFlatStyles(def.defaultStyles) : undefined,
    children: def.canHaveChildren ? [] : undefined,
  };

  // A bare list is useless in the canvas — seed one editable item.
  if (type === "list") {
    node.children = [createBlockNode("listItem")];
  }

  return node;
}

export function definitionFor(type: string): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find((item) => item.type === type);
}

type RenderOpts = {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  editable?: boolean;
  /** Editor canvas: render nested children (e.g. sortable wrappers). */
  renderChildren?: (children: BlockNode[], parent: BlockNode) => ReactNode;
  /**
   * Editor canvas: inline-editable text for heading / text / button.
   * Kept as a render prop so this module stays free of `"use client"` imports
   * (public pages still render as Server Components).
   */
  renderEditableText?: (args: {
    node: BlockNode;
    tag: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "li";
    text: string;
    multiline: boolean;
    className: string;
    domProps: Record<string, unknown>;
  }) => ReactNode;
  /** CSP nonce for the generated stylesheet (public pages). */
  styleNonce?: string;
};

/**
 * Render a block tree with a single generated stylesheet (container queries +
 * hover). No inline `style` attributes — required for style-src-attr CSP.
 */
export function renderBlockTree(
  nodes: BlockNode[],
  opts: RenderOpts = {},
): ReactNode {
  const css = buildTreeStylesheet(nodes);
  return (
    <>
      {css ? (
        <style
          // Sanitised declarations only — see buildTreeStylesheet / sanitizeStyleMap.
          dangerouslySetInnerHTML={{ __html: css }}
          nonce={opts.styleNonce}
        />
      ) : null}
      <div className="ps-tree">
        {nodes.map((node) => (
          <BlockRenderer key={node.id} node={node} opts={opts} />
        ))}
      </div>
    </>
  );
}

function BlockRenderer({
  node,
  opts,
}: {
  node: BlockNode;
  opts: RenderOpts;
}) {
  const selected = opts.selectedId === node.id;
  const editable = Boolean(opts.editable);
  const onClick = (event: React.MouseEvent) => {
    if (!editable || !opts.onSelect) return;
    event.stopPropagation();
    opts.onSelect(node.id);
  };

  const ring = selected
    ? "outline outline-2 outline-sky-400 outline-offset-2"
    : editable
      ? "hover:outline hover:outline-1 hover:outline-sky-400/50 hover:outline-offset-2"
      : "";

  const common = {
    className: cn(blockStyleClassName(node.id), ring),
    onClick: editable ? onClick : undefined,
    "data-block-id": node.id,
  } as const;

  const children =
    opts.renderChildren && node.children
      ? opts.renderChildren(node.children, node)
      : node.children && node.children.length > 0
        ? node.children.map((child) => (
            <BlockRenderer key={child.id} node={child} opts={opts} />
          ))
        : null;

  switch (node.type) {
    case "section": {
      const ariaLabel = node.props.ariaLabel;
      return (
        <section
          {...common}
          aria-label={
            typeof ariaLabel === "string" && ariaLabel.trim()
              ? ariaLabel.trim()
              : undefined
          }
        >
          {children}
        </section>
      );
    }
    case "container":
      return <div {...common}>{children}</div>;
    case "heading": {
      const level = Number(node.props.level ?? 2);
      const text = String(node.props.text ?? "");
      const Tag = (
        level === 1
          ? "h1"
          : level === 3
            ? "h3"
            : level === 4
              ? "h4"
              : "h2"
      ) as "h1" | "h2" | "h3" | "h4";
      if (editable && opts.renderEditableText) {
        return opts.renderEditableText({
          node,
          tag: Tag,
          text,
          multiline: false,
          className: common.className,
          domProps: {
            onClick: common.onClick,
            "data-block-id": node.id,
          },
        });
      }
      return <Tag {...common}>{text}</Tag>;
    }
    case "text": {
      const text = String(node.props.text ?? "");
      if (editable && opts.renderEditableText) {
        return opts.renderEditableText({
          node,
          tag: "p",
          text,
          multiline: true,
          className: cn(common.className, "whitespace-pre-wrap"),
          domProps: {
            onClick: common.onClick,
            "data-block-id": node.id,
          },
        });
      }
      return (
        <p {...common} className={cn(common.className, "whitespace-pre-wrap")}>
          {text}
        </p>
      );
    }
    case "list": {
      const ordered = Boolean(node.props.ordered);
      const Tag = ordered ? "ol" : "ul";
      return <Tag {...common}>{children}</Tag>;
    }
    case "listItem": {
      const text = String(node.props.text ?? "");
      if (editable && opts.renderEditableText) {
        return opts.renderEditableText({
          node,
          tag: "li",
          text,
          multiline: true,
          className: cn(common.className, "whitespace-pre-wrap"),
          domProps: {
            onClick: common.onClick,
            "data-block-id": node.id,
          },
        });
      }
      return (
        <li {...common} className={cn(common.className, "whitespace-pre-wrap")}>
          {text}
        </li>
      );
    }
    case "image": {
      const src = sanitizeUrl(node.props.src, "");
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...common}
          src={src || undefined}
          alt={String(node.props.alt ?? "")}
          loading="lazy"
          decoding="async"
        />
      );
    }
    case "button": {
      const href = sanitizeUrl(node.props.href, "#");
      const label = String(node.props.text ?? "Button");
      if (editable && opts.renderEditableText) {
        return opts.renderEditableText({
          node,
          tag: "span",
          text: label,
          multiline: false,
          className: common.className,
          domProps: {
            role: "link",
            "data-block-id": node.id,
            onClick: (event: React.MouseEvent) => {
              event.preventDefault();
              onClick(event);
            },
          },
        });
      }
      return (
        <a
          {...common}
          href={editable ? undefined : href}
          rel={
            !editable && isExternalUrl(href) ? "noopener noreferrer" : undefined
          }
          onClick={
            editable
              ? (event) => {
                  event.preventDefault();
                  onClick(event);
                }
              : undefined
          }
        >
          {label}
        </a>
      );
    }
    case "divider":
      return <hr {...common} />;
    default:
      if (!editable) return null;
      return (
        <div {...common}>
          Unknown block: {node.type}
          {children}
        </div>
      );
  }
}

export type { ResponsiveStyles };
