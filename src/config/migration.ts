import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * Checks if the drizzle migration table exists.
 * Later we can also compare pending migrations.
 */
export async function checkMigrationStatus(): Promise<boolean> {
  const rows = await db.execute(
    sql`SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'drizzle'
          AND table_name = '__drizzle_migrations'
      ) AS "exists"`,
  );

  const first = rows[0] as { exists: boolean } | undefined;
  return first?.exists === true;
}
