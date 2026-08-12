import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { baseColumns } from "./base-columns";
import type { ResponsiveStyles } from "@/lib/blocks/styles";

export const rolesTable = pgTable("roles", {
  ...baseColumns,
  roleName: varchar("role_name", { length: 64 }).notNull().unique(),
  /** Comma-separated permission keys from `config/permissions.ts`. */
  permissions: text("permissions").notNull().default(""),
});

export const userTable = pgTable(
  "users",
  {
    ...baseColumns,
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    /** Matches `roles.role_name` (source of permissions). */
    role: varchar("role", { length: 64 })
      .notNull()
      .default("viewer")
      .references(() => rolesTable.roleName),
  },
  (table) => [index("users_role_idx").on(table.role)],
);

export const userRefreshTokenTable = pgTable(
  "user_refresh_tokens",
  {
    ...baseColumns,
    userId: varchar("user_id")
      .notNull()
      .references(() => userTable.id),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("user_refresh_tokens_token_uidx").on(table.token),
    index("user_refresh_tokens_user_id_idx").on(table.userId),
    index("user_refresh_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

/** Nested HTML-like node stored inside a {@link BlockDocument}. */
export type BlockNode = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  /**
   * Responsive / state style slices (`base`, `sm`, `md`, `lg`, `hover`).
   * Flat `Record<string,string>` is legacy v1 and is wrapped into `{ base }`
   * on read via `migrateBlockDocument`.
   */
  styles?: ResponsiveStyles;
  children?: BlockNode[];
};

/**
 * Versioned block tree. Stored in `pages.content`, `blocks.children`, and
 * inside `published_snapshot.content`. Bare `BlockNode[]` is legacy (v0) and
 * is upgraded on read via `migrateBlockDocument`.
 */
export type BlockDocument = {
  version: number;
  nodes: BlockNode[];
};

const emptyBlockDocumentSql = sql`'{"version":1,"nodes":[]}'::jsonb`;

export const blocksTable = pgTable(
  "blocks",
  {
    ...baseColumns,
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull().default(""),
    /** When true, this block can be attached to pages as a reusable layout. */
    canBeLayout: boolean("can_be_layout").notNull().default(false),
    /** Versioned nested child elements for this block (draft). */
    children: jsonb("children")
      .$type<BlockDocument>()
      .notNull()
      .default(emptyBlockDocumentSql),
    /**
     * Published layout tree. Public pages that reference this block as a layout
     * read this column — editing `children` alone does not change the live site.
     */
    publishedChildren: jsonb("published_children").$type<BlockDocument>(),
  },
  (table) => [index("blocks_can_be_layout_idx").on(table.canBeLayout)],
);

/**
 * Frozen copy of everything the public renderer reads from a page, written
 * when the page is published. Keeping it separate from the live columns is
 * what makes the editor a true draft surface: saving edits touches only the
 * live columns, so the public site keeps serving this snapshot until someone
 * publishes again. `slug` is deliberately absent — it is the page's address,
 * not its content, so renaming it moves the live page immediately.
 */
export type PublishedPageSnapshot = {
  title: string;
  description: string;
  blockId: string | null;
  content: BlockDocument;
  /** Layout block tree frozen at publish time. */
  layoutChildren?: BlockDocument;
};

export const pagesTable = pgTable("pages", {
  ...baseColumns,
  title: varchar("title", { length: 255 }).notNull(),
  /** `null` = site landing page served at `/`. */
  slug: varchar("slug", { length: 255 }).unique(),
  description: text("description").notNull().default(""),
  /** Editable page body tree (the draft), versioned. */
  content: jsonb("content")
    .$type<BlockDocument>()
    .notNull()
    .default(emptyBlockDocumentSql),
  /** Optional layout block (`blocks.can_be_layout = true`). */
  blockId: varchar("block_id").references(() => blocksTable.id),
  /** What the public site serves. Written on publish, `null` until then. */
  publishedSnapshot: jsonb("published_snapshot").$type<PublishedPageSnapshot>(),
});
