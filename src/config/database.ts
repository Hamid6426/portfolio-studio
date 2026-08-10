import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export type DatabaseCheckResult =
  | { success: true; message: "" }
  | { success: false; message: string };

function humanizeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "We couldn't reach the database, but we're not sure why. Please try again.";
  }

  const message = error.message;

  if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
    return "We couldn't reach your database. Please check that the connection string in .env.local is correct and that your database is running, then try again.";
  }

  if (message.includes("password authentication failed")) {
    return "The password in your database connection string isn't correct. Please double-check it in .env.local and try again.";
  }

  if (message.includes("database does not exist")) {
    return "We couldn't find the database. Please check the database name in your connection string, then try again.";
  }

  if (message.includes("timeout") || message.includes("timed out")) {
    return "We couldn't reach your database in time. It may be paused or unreachable — please try again in a moment.";
  }

  return "We couldn't reach the database. Please check the connection string in .env.local, then try again.";
}

export async function checkDatabaseConnection(): Promise<DatabaseCheckResult> {
  try {
    await db.execute(sql`SELECT 1`);

    return {
      success: true,
      message: "",
    };
  } catch (error) {
    return {
      success: false,
      message: humanizeError(error),
    };
  }
}
