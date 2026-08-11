import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { env } from "@/config/env";
import * as schema from "./schema";

/** Bust the HMR-cached client when tables are added/removed from the schema. */
const SCHEMA_KEY = Object.keys(schema).sort().join(",");

const globalForDb = globalThis as unknown as {
  __dbClient?: ReturnType<typeof createClient>;
  __dbSchemaKey?: string;
};

function createClient() {
  const client = postgres(env.DATABASE_URL, {
    max: 10,
    prepare: false,
  });

  return drizzle(client, { schema });
}

function getDb() {
  if (
    globalForDb.__dbClient &&
    globalForDb.__dbSchemaKey === SCHEMA_KEY
  ) {
    return globalForDb.__dbClient;
  }

  const next = createClient();

  if (env.NODE_ENV !== "production") {
    globalForDb.__dbClient = next;
    globalForDb.__dbSchemaKey = SCHEMA_KEY;
  }

  return next;
}

export const db = getDb();
