import type { ApiErrorResponse } from "@/responses/common";

/** Walk Drizzle/postgres error chains for a Postgres SQLSTATE code. */
export function getPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current !== "object" || current === null) break;

    const record = current as {
      code?: unknown;
      cause?: unknown;
    };

    if (typeof record.code === "string" && /^[0-9A-Z]{5}$/.test(record.code)) {
      return record.code;
    }

    current = record.cause;
  }

  return undefined;
}

/**
 * Map common Postgres SQLSTATE codes to API errors.
 * Returns null when the error isn't a recognized DB code.
 */
export function apiErrorFromPostgres(
  error: unknown,
  fallbackMessage: string,
): ApiErrorResponse {
  const code = getPostgresErrorCode(error);

  switch (code) {
    case "42P01": // undefined_table
      return {
        success: false,
        statusCode: 503,
        message:
          "Your database is missing required tables. Run `bun run db:migrate` and try again.",
      };
    case "42703": // undefined_column
      return {
        success: false,
        statusCode: 503,
        message:
          "Your database schema is out of date. Run `bun run db:generate` then `bun run db:migrate` and try again.",
      };
    case "3D000": // invalid_catalog_name
      return {
        success: false,
        statusCode: 503,
        message:
          "The database in your connection string does not exist. Create it, then run migrations.",
      };
    case "28P01": // invalid_password
      return {
        success: false,
        statusCode: 503,
        message:
          "Database authentication failed. Check the password in DATABASE_URL.",
      };
    case "23505": // unique_violation
      return {
        success: false,
        statusCode: 409,
        message: "That record already exists.",
      };
    case "23503": // foreign_key_violation
      return {
        success: false,
        statusCode: 400,
        message: "That request references data that does not exist.",
      };
    default:
      return {
        success: false,
        statusCode: 500,
        message: fallbackMessage,
      };
  }
}
