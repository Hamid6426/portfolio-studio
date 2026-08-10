import { text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const baseColumns = {
    get id() {
        return text("id")
            .primaryKey()
            .default(sql`gen_random_uuid()`);
    },
    get publishedAt() { return timestamp("published_at", { withTimezone: true }); },
    get deletedAt() { return timestamp("deleted_at", { withTimezone: true }); },
    get createdAt() {
        return timestamp("created_at", { withTimezone: true }).defaultNow();
    },
    get updatedAt() {
        return timestamp("updated_at", { withTimezone: true }).defaultNow();
    },
};
