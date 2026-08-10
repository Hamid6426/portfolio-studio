import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { roleEnum } from "./enums";
import { baseColumns } from "./base-columns";

export const userTable = pgTable("users", {
    ...baseColumns,
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: roleEnum("role").default("viewer").notNull(),
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
