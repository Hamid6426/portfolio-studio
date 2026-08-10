import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { env } from "@/config/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __dbClient?: ReturnType<typeof createClient>;
};

function createClient() {
  const client = postgres(env.DATABASE_URL, {
    max: 10,
    prepare: false,
  });

  return drizzle(client, { schema });
}

export const db = globalForDb.__dbClient ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForDb.__dbClient = db;
}
