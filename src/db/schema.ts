import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { baseColumns } from "./base-columns";
import type {
  BlockDocument,
  PublishedPageSnapshot,
  SiteThemeSettings,
} from "./schema.types";

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

/**
 * Singleton site configuration (one row, `key = 'default'`).
 * Theme definitions live in code; this table stores the active selection,
 * optional token overrides, and an optional site-wide default layout.
 */
export const siteSettingsTable = pgTable("site_settings", {
  ...baseColumns,
  /** Always `"default"` for the single-site install. */
  key: varchar("key", { length: 64 }).notNull().unique().default("default"),
  /** Must match an id in `src/lib/themes/registry.ts`. */
  themeId: varchar("theme_id", { length: 64 }).notNull().default("developer"),
  themeSettings: jsonb("theme_settings")
    .$type<SiteThemeSettings>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  /**
   * Layout used by pages with no per-page `blockId`. Themes may set this on
   * apply when their `suggestedLayoutName` matches a layout block.
   */
  defaultLayoutBlockId: varchar("default_layout_block_id").references(
    () => blocksTable.id,
  ),
});

/**
 * Uploaded media files. Bytes live under project-root `upload/`; this table is
 * the catalogue (original name, mime, size, public URL path).
 */
export const assetsTable = pgTable(
  "assets",
  {
    ...baseColumns,
    /** Filename on disk (`uuid.ext`) — never a user-controlled path. */
    storedName: varchar("stored_name", { length: 255 }).notNull().unique(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    /** Public path, e.g. `/upload/<stored_name>`. */
    url: varchar("url", { length: 512 }).notNull(),
    uploadedBy: varchar("uploaded_by").references(() => userTable.id),
  },
  (table) => [index("assets_uploaded_by_idx").on(table.uploadedBy)],
);

/**
 * Point-in-time copies of page/block draft trees for History / restore.
 * Autosaves are throttled; identical trees are skipped — see
 * `repositories/revisions.ts`.
 */
export const contentRevisionsTable = pgTable(
  "content_revisions",
  {
    ...baseColumns,
    /** `"page"` or `"block"`. */
    entityType: varchar("entity_type", { length: 16 }).notNull(),
    entityId: varchar("entity_id").notNull(),
    document: jsonb("document").$type<BlockDocument>().notNull(),
    /** `"autosave"` | `"manual"` | `"restore"`. */
    source: varchar("source", { length: 16 }).notNull(),
    createdBy: varchar("created_by").references(() => userTable.id),
  },
  (table) => [
    index("content_revisions_entity_created_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  ],
);
