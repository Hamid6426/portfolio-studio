/**
 * The shape of a seed dataset.
 *
 * A dataset is **pure content**: no block trees, no styles, no ids. It lists
 * the pages of the site and, for each page, an ordered list of `SectionSpec`s —
 * small data records that say *what* a section contains, never *how* it looks.
 * `scripts/sections.ts` turns each spec into a `BlockNode[]`, so every layout
 * and styling decision lives there and a dataset stays readable and portable.
 *
 * Every spec maps to exactly one `section` block on the page, in order.
 *
 * To make your own: copy `scripts/datasets/example.ts` to
 * `scripts/datasets/<you>.private.ts` (gitignored), edit the content, then run
 * `bun run db:seed -- --dataset=<you>.private`.
 */

/* ── shared pieces ───────────────────────────────────────────────────────── */

/** One entry in the site navigation, repeated at the top of every page. */
export type NavLink = {
  label: string;
  /** `/` for the landing page, `/<slug>` for the rest, or an external URL. */
  href: string;
};

/** A call-to-action. `primary` is the filled button, `secondary` the outline. */
export type LinkSpec = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

/**
 * Which surface a section sits on. Sections normally alternate
 * `default` / `alt` down the page so the eye can find the seams.
 */
export type Background = "default" | "alt";

/** Vertical rhythm. `tight` is for a strip that hugs the section above it. */
export type Spacing = "default" | "tight";

type Surface = {
  background?: Background;
  spacing?: Spacing;
};

/** One card in a `cardGrid`. Every field but `title` is optional. */
export type CardItem = {
  /** Small label above the title, e.g. "Email" or "Role". */
  eyebrow?: string;
  title: string;
  /** One emphasised line under the title, e.g. an organisation or a role. */
  subtitle?: string;
  /** Body copy: a string, or several strings for several paragraphs. */
  body?: string | string[];
  /** Dimmed trailing line, e.g. a date range or a funding figure. */
  meta?: string;
  /** Buttons rendered at the foot of the card. */
  links?: LinkSpec[];
};

/** A titled bundle of one-line items, rendered as a bulleted list. */
export type ItemGroup = {
  /** Omit to render the bullets bare; provide it to box them in a card. */
  heading?: string;
  items: string[];
};

/** One row of a `timeline`. */
export type TimelineEntry = {
  /** e.g. "2021 – Present". */
  period: string;
  title: string;
  organization?: string;
  detail?: string;
};

/** One entry in a `citationList` — a paper, article, talk or book chapter. */
export type Citation = {
  title: string;
  authors: string[];
  /** Journal, conference, publisher or venue. */
  source?: string;
  year?: number;
  /** Page range; printed as `pp. <pages>`. */
  pages?: string;
  /** Category label, e.g. "ISI-indexed Q1 Journal" or "Conference talk". */
  index?: string;
  /** Printed as `Impact factor <n>`. */
  impactFactor?: number;
};

/** A stat tile: a big number over a small label. */
export type Stat = {
  label: string;
  /** Pre-formatted, so "1,099" and "In process" are both fine. */
  value: string;
};

/* ── section specs ───────────────────────────────────────────────────────── */

/** The landing-page opener: nav, name, headline and calls to action. */
export type HeroSection = {
  kind: "hero";
  /** Small line above the name, e.g. an employer or a location. */
  eyebrow?: string;
  title: string;
  /** Post-nominals or short tags, joined with `·`. */
  credentials?: string[];
  /** One line under the name, e.g. a job title. */
  subtitle?: string;
  /** A sentence of positioning. */
  tagline?: string;
  actions?: LinkSpec[];
};

/** The opener for every page that is not the landing page. */
export type PageHeaderSection = {
  kind: "pageHeader";
  title: string;
  blurb?: string;
};

/** Running prose: a heading and one or more paragraphs. */
export type ProseSection = Surface & {
  kind: "prose";
  heading?: string;
  paragraphs: string[];
  actions?: LinkSpec[];
};

/** A strip of stat tiles. */
export type StatRowSection = Surface & {
  kind: "statRow";
  heading?: string;
  /** Tiles per row (there is no wrapping, so keep labels short). Default 3. */
  perRow?: 2 | 3 | 4;
  stats: Stat[];
  actions?: LinkSpec[];
};

/** Bulleted lists, optionally split into titled groups. */
export type ItemListSection = Surface & {
  kind: "itemList";
  heading?: string;
  groups: ItemGroup[];
};

/** Cards: positions, projects, awards, contact methods — the workhorse. */
export type CardGridSection = Surface & {
  kind: "cardGrid";
  heading?: string;
  /** A paragraph between the heading and the cards. */
  intro?: string;
  /** Cards per row. Default 1 (a stack). Rows do not wrap. */
  columns?: 1 | 2 | 3;
  /** `card` is boxed; `flush` is a borderless row, good for long lists. */
  variant?: "card" | "flush";
  /** Heading level for card titles: 4 for long lists of short entries. */
  titleLevel?: 3 | 4;
  items: CardItem[];
};

/** Rows of buttons under headings, separated by dividers. */
export type LinkRowSection = Surface & {
  kind: "linkRow";
  groups: { heading?: string; links: LinkSpec[] }[];
};

/** A dated history, newest first. */
export type TimelineSection = Surface & {
  kind: "timeline";
  heading?: string;
  entries: TimelineEntry[];
};

/** A numbered bibliography. */
export type CitationListSection = Surface & {
  kind: "citationList";
  heading?: string;
  items: Citation[];
};

export type SectionSpec =
  | HeroSection
  | PageHeaderSection
  | ProseSection
  | StatRowSection
  | ItemListSection
  | CardGridSection
  | LinkRowSection
  | TimelineSection
  | CitationListSection;

/* ── pages and dataset ───────────────────────────────────────────────────── */

export type SeedPage = {
  title: string;
  /** `null` = the landing page served at `/`. Otherwise the `/<slug>` path. */
  slug: string | null;
  /** Meta description for the page. */
  description: string;
  sections: SectionSpec[];
};

export type PortfolioDataset = {
  /**
   * The first dashboard account. Created once, then never touched again:
   * change the password from the dashboard after the first login.
   */
  admin: {
    name: string;
    email: string;
    password: string;
  };
  /** Site navigation. A link whose `href` matches the current page is marked. */
  nav: NavLink[];
  pages: SeedPage[];
};
