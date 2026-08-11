import {
  boolean,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./base-columns";

export const rolesTable = pgTable("roles", {
  ...baseColumns,
  roleName: varchar("role_name", { length: 64 }).notNull().unique(),
  /** Comma-separated permission keys from `config/permissions.ts`. */
  permissions: text("permissions").notNull().default(""),
});

export const userTable = pgTable("users", {
  ...baseColumns,
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Matches `roles.role_name` (source of permissions). */
  role: varchar("role", { length: 64 })
    .notNull()
    .default("viewer")
    .references(() => rolesTable.roleName),
});

export const userRefreshTokenTable = pgTable("user_refresh_tokens", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const userProfileTable = pgTable("user_profiles", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    avatar: varchar("avatar", { length: 255 }).notNull().default(""),
    bio: varchar("bio", { length: 255 }).notNull().default(""),
    website: varchar("website", { length: 255 }).notNull().default(""),
    location: varchar("location", { length: 255 }).notNull().default(""),
    phone: varchar("phone", { length: 255 }).notNull().default(""),
});


export const userSocialTable = pgTable("user_socials", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    social: varchar("social", { length: 255 }).notNull(),
    url: varchar("url", { length: 255 }).notNull(),
});

export const userEducationTable = pgTable("user_educations", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    school: varchar("school", { length: 255 }).notNull(),
    degree: varchar("degree", { length: 255 }).notNull(),
    fieldOfStudy: varchar("field_of_study", { length: 255 }).notNull(),
});

export const userExperienceTable = pgTable("user_experiences", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    company: varchar("company", { length: 255 }).notNull(),
    position: varchar("position", { length: 255 }).notNull(),
});

export const userSkillTable = pgTable("user_skills", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    skill: varchar("skill", { length: 255 }).notNull(),
});

export const userProjectTable = pgTable("user_projects", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    project: varchar("project", { length: 255 }).notNull(),
});

export const userAchievementTable = pgTable("user_achievements", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    achievement: varchar("achievement", { length: 255 }).notNull(),
});

export const userPublicationTable = pgTable("user_publications", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    publication: varchar("publication", { length: 255 }).notNull(),
});

export const userAwardTable = pgTable("user_awards", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    award: varchar("award", { length: 255 }).notNull(),
});

export const userServiceTable = pgTable("user_services", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    service: varchar("service", { length: 255 }).notNull(),
});



export const portfolioTable = pgTable("portfolios", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: varchar("description").notNull(),
});

/** Nested HTML-like node stored in a block/page tree. */
export type BlockNode = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  styles?: Record<string, string>;
  children?: BlockNode[];
};

export const blocksTable = pgTable("blocks", {
  ...baseColumns,
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  /** When true, this block can be attached to pages as a reusable layout. */
  canBeLayout: boolean("can_be_layout").notNull().default(false),
  /** Nested child elements for this block. */
  children: jsonb("children").$type<BlockNode[]>().notNull().default([]),
});

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
  content: BlockNode[];
};

export const pagesTable = pgTable("pages", {
  ...baseColumns,
  title: varchar("title", { length: 255 }).notNull(),
  /** `null` = site landing page served at `/`. */
  slug: varchar("slug", { length: 255 }).unique(),
  description: text("description").notNull().default(""),
  /** Editable page body tree (the draft). */
  content: jsonb("content").$type<BlockNode[]>().notNull().default([]),
  /** Optional layout block (`blocks.can_be_layout = true`). */
  blockId: varchar("block_id").references(() => blocksTable.id),
  /** What the public site serves. Written on publish, `null` until then. */
  publishedSnapshot: jsonb("published_snapshot").$type<PublishedPageSnapshot>(),
});
