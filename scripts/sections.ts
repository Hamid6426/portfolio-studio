/**
 * Turns the content records of a dataset (`SectionSpec`) into `BlockNode`
 * trees. Every layout and styling decision the seed makes lives in this file,
 * which is what lets a dataset be pure content.
 *
 * The public site renders on a dark surface (`globals.css` pins
 * `color-scheme: dark`), so colours here are translucent whites over the page
 * background rather than fixed hex values.
 *
 * Composition notes — the editor has no list, table or card block, so:
 * - lists are one `text` node per item, prefixed with a bullet glyph (a single
 *   `text` node cannot render line breaks: it becomes one `<p>` and the
 *   allowlist has no `whiteSpace`);
 * - "cards" are `container`s with a border/background;
 * - "rows" are `container`s with `flexDirection: row`. There is no `flexWrap`
 *   in the style allowlist, so rows are kept to at most four short items.
 */
import type { BlockNode } from "@/db/schema";

import type {
  Background,
  CardGridSection,
  CardItem,
  Citation,
  CitationListSection,
  HeroSection,
  ItemListSection,
  LinkRowSection,
  LinkSpec,
  NavLink,
  PageHeaderSection,
  ProseSection,
  SectionSpec,
  SeedPage,
  Spacing,
  Stat,
  StatRowSection,
  TimelineSection,
} from "./datasets/types";
import {
  button,
  container,
  divider,
  heading,
  section,
  text,
} from "./seed-blocks";

/* ── shared style tokens ─────────────────────────────────────────────────── */

const MUTED = "rgba(255,255,255,0.72)";
const SUBTLE = "rgba(255,255,255,0.55)";
const HAIRLINE = "1px solid rgba(255,255,255,0.12)";
const CARD_BG = "rgba(255,255,255,0.04)";

const SECTION: Record<string, string> = { padding: "56px 24px" };
const SECTION_ALT: Record<string, string> = {
  padding: "56px 24px",
  background: "rgba(255,255,255,0.03)",
};
const SECTION_TIGHT: Record<string, string> = { padding: "24px 24px 8px" };
const SECTION_TIGHT_ALT: Record<string, string> = {
  padding: "24px 24px 8px",
  background: "rgba(255,255,255,0.03)",
};
const WRAP: Record<string, string> = { maxWidth: "920px", gap: "20px" };
const ROW: Record<string, string> = {
  flexDirection: "row",
  gap: "16px",
  alignItems: "stretch",
  maxWidth: "920px",
};
const NAV_ROW: Record<string, string> = {
  flexDirection: "row",
  gap: "10px",
  justifyContent: "center",
  alignItems: "center",
  maxWidth: "920px",
};
const BUTTON_ROW: Record<string, string> = {
  ...NAV_ROW,
  justifyContent: "flex-start",
};
const H2: Record<string, string> = { fontSize: "30px", fontWeight: "600" };
const H3: Record<string, string> = { fontSize: "19px", fontWeight: "600" };
const H4: Record<string, string> = { fontSize: "17px", fontWeight: "600" };
const BODY: Record<string, string> = {
  fontSize: "16px",
  lineHeight: "1.7",
  color: MUTED,
};
const META: Record<string, string> = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: SUBTLE,
};
/**
 * `maxWidth: 100%` overrides the container default (720px) so nested
 * containers fill their parent instead of being re-centred inside it.
 */
const CARD: Record<string, string> = {
  gap: "6px",
  padding: "18px 20px",
  background: CARD_BG,
  border: HAIRLINE,
  borderRadius: "12px",
  width: "100%",
  maxWidth: "100%",
};
const FLUSH_ROW: Record<string, string> = {
  gap: "2px",
  padding: "12px 0",
  borderTop: "1px solid rgba(255,255,255,0.10)",
  width: "100%",
  maxWidth: "100%",
};
const LINK_BUTTON: Record<string, string> = {
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.95)",
  border: HAIRLINE,
  borderRadius: "999px",
  padding: "9px 16px",
  fontSize: "15px",
};
const PRIMARY_BUTTON: Record<string, string> = {
  background: "#ffffff",
  color: "#111111",
  borderRadius: "999px",
  padding: "10px 20px",
  fontSize: "15px",
  fontWeight: "600",
};

/** What a page needs to know about the site around it. */
type SectionContext = {
  nav: NavLink[];
  /** The current page's own href, so its nav link can be highlighted. */
  currentHref: string;
};

/* ── primitives ──────────────────────────────────────────────────────────── */

function surface(
  background: Background = "default",
  spacing: Spacing = "default",
): Record<string, string> {
  if (spacing === "tight") {
    return background === "alt" ? SECTION_TIGHT_ALT : SECTION_TIGHT;
  }
  return background === "alt" ? SECTION_ALT : SECTION;
}

/** A section holding one centred column of content. */
function panel(
  children: BlockNode[],
  spec: { background?: Background; spacing?: Spacing },
  wrap: Record<string, string> = WRAP,
): BlockNode {
  return section(
    [container(children, wrap)],
    surface(spec.background, spec.spacing),
  );
}

function actionButton(link: LinkSpec): BlockNode {
  return button(
    link.label,
    link.href,
    link.variant === "primary" ? PRIMARY_BUTTON : LINK_BUTTON,
  );
}

function buttonRow(
  links: LinkSpec[],
  styles: Record<string, string> = BUTTON_ROW,
): BlockNode {
  return container(links.map(actionButton), styles);
}

function bullets(items: string[]): BlockNode[] {
  return items.map((item) => text(`• ${item}`, BODY));
}

function paragraphs(value: string | string[] | undefined): BlockNode[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((paragraph) => text(paragraph, BODY));
}

/** Site navigation, repeated at the top of every page. */
function navRow(nav: NavLink[], currentHref: string): BlockNode {
  return container(
    nav.map((link) =>
      button(
        link.label,
        link.href,
        link.href === currentHref
          ? { ...LINK_BUTTON, background: "rgba(255,255,255,0.18)" }
          : LINK_BUTTON,
      ),
    ),
    NAV_ROW,
  );
}

function statCard(stat: Stat): BlockNode {
  return container(
    [
      heading(stat.value, 3, {
        fontSize: "28px",
        fontWeight: "700",
        textAlign: "center",
      }),
      text(stat.label, { ...META, textAlign: "center" }),
    ],
    {
      ...CARD,
      gap: "4px",
      padding: "18px 12px",
      alignItems: "center",
      justifyContent: "center",
    },
  );
}

/** Stat tiles chunked into non-wrapping rows. */
function statRows(stats: Stat[], perRow: number): BlockNode[] {
  const rows: BlockNode[] = [];
  for (let i = 0; i < stats.length; i += perRow) {
    rows.push(container(stats.slice(i, i + perRow).map(statCard), ROW));
  }
  return rows;
}

function cardNode(
  item: CardItem,
  variant: "card" | "flush",
  titleLevel: 3 | 4,
): BlockNode {
  const children: BlockNode[] = [];

  if (item.eyebrow) children.push(text(item.eyebrow, META));

  children.push(
    variant === "flush"
      ? text(item.title, { fontSize: "16px", fontWeight: "600" })
      : heading(item.title, titleLevel, titleLevel === 4 ? H4 : H3),
  );

  if (item.subtitle) children.push(text(item.subtitle, BODY));
  children.push(...paragraphs(item.body));
  if (item.meta) children.push(text(item.meta, META));
  if (item.links?.length) {
    children.push(buttonRow(item.links, { ...BUTTON_ROW, margin: "6px 0 0" }));
  }

  return container(children, variant === "flush" ? FLUSH_ROW : CARD);
}

function citationEntry(citation: Citation, index: number): BlockNode {
  const source = [
    citation.source,
    citation.year ? String(citation.year) : null,
    citation.pages ? `pp. ${citation.pages}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const tags = [
    citation.index,
    citation.impactFactor ? `Impact factor ${citation.impactFactor}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const children: BlockNode[] = [
    text(`${index}. ${citation.title}`, {
      fontSize: "17px",
      lineHeight: "1.5",
      fontWeight: "600",
    }),
  ];

  if (citation.authors.length > 0) {
    children.push(text(citation.authors.join(", "), { ...BODY, fontSize: "15px" }));
  }
  if (source) children.push(text(source, { ...META, color: MUTED }));
  if (tags) children.push(text(tags, META));

  return container(children, { ...FLUSH_ROW, gap: "4px", padding: "18px 0" });
}

/* ── section builders ────────────────────────────────────────────────────── */

function heroSection(spec: HeroSection, ctx: SectionContext): BlockNode {
  const children: BlockNode[] = [navRow(ctx.nav, ctx.currentHref)];

  if (spec.eyebrow) {
    children.push(text(spec.eyebrow, { ...META, textAlign: "center" }));
  }

  children.push(
    heading(spec.title, 1, {
      fontSize: "48px",
      fontWeight: "700",
      textAlign: "center",
      margin: "8px 0 0",
    }),
  );

  if (spec.credentials?.length) {
    children.push(
      text(spec.credentials.join(" · "), {
        ...META,
        textAlign: "center",
        fontSize: "15px",
      }),
    );
  }

  if (spec.subtitle) {
    children.push(
      heading(spec.subtitle, 2, {
        fontSize: "20px",
        fontWeight: "500",
        textAlign: "center",
        color: MUTED,
        margin: "8px 0 0",
      }),
    );
  }

  if (spec.tagline) {
    children.push(
      text(spec.tagline, { ...BODY, fontSize: "18px", textAlign: "center" }),
    );
  }

  if (spec.actions?.length) {
    children.push(
      buttonRow(spec.actions, { ...NAV_ROW, gap: "12px", margin: "8px 0 0" }),
    );
  }

  return section(
    [
      container(children, {
        ...WRAP,
        alignItems: "center",
        gap: "12px",
        maxWidth: "820px",
      }),
    ],
    { padding: "56px 24px 32px" },
  );
}

function pageHeaderSection(
  spec: PageHeaderSection,
  ctx: SectionContext,
): BlockNode {
  const children: BlockNode[] = [
    navRow(ctx.nav, ctx.currentHref),
    heading(spec.title, 1, {
      fontSize: "40px",
      fontWeight: "700",
      textAlign: "center",
      margin: "16px 0 0",
    }),
  ];

  if (spec.blurb) {
    children.push(text(spec.blurb, { ...BODY, textAlign: "center" }));
  }

  return section(
    [
      container(children, { ...WRAP, alignItems: "center", gap: "14px" }),
    ],
    { padding: "40px 24px 8px" },
  );
}

function proseSection(spec: ProseSection): BlockNode {
  const children: BlockNode[] = [];
  if (spec.heading) children.push(heading(spec.heading, 2, H2));
  children.push(...paragraphs(spec.paragraphs));
  if (spec.actions?.length) children.push(buttonRow(spec.actions));

  return panel(children, spec, { ...WRAP, gap: "16px" });
}

function statRowSection(spec: StatRowSection): BlockNode {
  const children: BlockNode[] = [];
  if (spec.heading) children.push(heading(spec.heading, 2, H2));
  children.push(...statRows(spec.stats, spec.perRow ?? 3));
  if (spec.actions?.length) children.push(buttonRow(spec.actions));

  return panel(children, spec);
}

function itemListSection(spec: ItemListSection): BlockNode {
  const children: BlockNode[] = [];
  if (spec.heading) children.push(heading(spec.heading, 2, H2));

  for (const group of spec.groups) {
    if (group.heading) {
      children.push(
        container(
          [heading(group.heading, 3, H3), ...bullets(group.items)],
          { ...CARD, gap: "8px" },
        ),
      );
      continue;
    }
    children.push(...bullets(group.items));
  }

  return panel(children, spec);
}

function cardGridSection(spec: CardGridSection): BlockNode {
  const variant = spec.variant ?? "card";
  const titleLevel = spec.titleLevel ?? 3;
  const columns = spec.columns ?? 1;

  const children: BlockNode[] = [];
  if (spec.heading) children.push(heading(spec.heading, 2, H2));
  if (spec.intro) children.push(text(spec.intro, BODY));

  const cards = spec.items.map((item) => cardNode(item, variant, titleLevel));

  if (columns > 1) {
    for (let i = 0; i < cards.length; i += columns) {
      children.push(container(cards.slice(i, i + columns), ROW));
    }
  } else {
    children.push(...cards);
  }

  return panel(children, spec);
}

function linkRowSection(spec: LinkRowSection): BlockNode {
  const children: BlockNode[] = [];

  spec.groups.forEach((group, index) => {
    if (index > 0) children.push(divider());
    if (group.heading) children.push(heading(group.heading, 2, H2));
    children.push(buttonRow(group.links));
  });

  return panel(children, spec);
}

function timelineSection(spec: TimelineSection): BlockNode {
  const children: BlockNode[] = [];
  if (spec.heading) children.push(heading(spec.heading, 2, H2));

  for (const entry of spec.entries) {
    const row: BlockNode[] = [
      text(entry.period, META),
      text(entry.title, { fontSize: "17px", fontWeight: "600" }),
    ];
    if (entry.organization) row.push(text(entry.organization, BODY));
    if (entry.detail) row.push(text(entry.detail, { ...BODY, fontSize: "15px" }));
    children.push(container(row, FLUSH_ROW));
  }

  return panel(children, spec);
}

function citationListSection(spec: CitationListSection): BlockNode {
  const entries = spec.items.map((citation, index) =>
    citationEntry(citation, index + 1),
  );

  // Without a heading the list is the whole column, so it *is* the wrapper;
  // with one it nests, and has to opt out of the container's 720px re-centring.
  if (!spec.heading) {
    return section([container(entries, { ...WRAP, gap: "0px" })], surface(
      spec.background,
      spec.spacing,
    ));
  }

  return panel(
    [
      heading(spec.heading, 2, H2),
      container(entries, { gap: "0px", width: "100%", maxWidth: "100%" }),
    ],
    spec,
  );
}

/* ── entry point ─────────────────────────────────────────────────────────── */

function buildSection(spec: SectionSpec, ctx: SectionContext): BlockNode {
  switch (spec.kind) {
    case "hero":
      return heroSection(spec, ctx);
    case "pageHeader":
      return pageHeaderSection(spec, ctx);
    case "prose":
      return proseSection(spec);
    case "statRow":
      return statRowSection(spec);
    case "itemList":
      return itemListSection(spec);
    case "cardGrid":
      return cardGridSection(spec);
    case "linkRow":
      return linkRowSection(spec);
    case "timeline":
      return timelineSection(spec);
    case "citationList":
      return citationListSection(spec);
  }
}

/** The stored `content` for one page: one `section` block per `SectionSpec`. */
export function buildPageContent(page: SeedPage, nav: NavLink[]): BlockNode[] {
  const ctx: SectionContext = {
    nav,
    currentHref: page.slug === null ? "/" : `/${page.slug}`,
  };

  return page.sections.map((spec) => buildSection(spec, ctx));
}
