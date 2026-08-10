import { pgTable, varchar } from "drizzle-orm/pg-core";
import { roleEnum } from "./enums";
import { baseColumns } from "./base-columns";

export const userTable = pgTable("users", {
    ...baseColumns,
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: roleEnum("role").default("viewer").notNull(),
});

export const portfolioTable = pgTable("portfolios", {
    ...baseColumns,
    userId: varchar("user_id")
        .notNull()
        .references(() => userTable.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: varchar("description").notNull(),
});
