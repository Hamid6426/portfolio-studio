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

  return {
    id: crypto.randomUUID(),
    type: def.type,
    props: { ...def.defaultProps },
    styles: def.defaultStyles ? wrapFlatStyles(def.defaultStyles) : undefined,
    children: def.canHaveChildren ? [] : undefined,
  };
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
      return <Tag {...common}>{text}</Tag>;
    }
    case "text":
      return <p {...common}>{String(node.props.text ?? "")}</p>;
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
          {String(node.props.text ?? "Button")}
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
