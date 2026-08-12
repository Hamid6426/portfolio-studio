import { checkDatabaseConnection } from "./database";
import { checkAdminExists } from "./setup";
import { checkMigrationStatus } from "./migration";

export type StartupState =
  | {
      state: "ready";
    }
  | {
      state: "database-connection-failed";
      message: string;
    }
  | {
      state: "needs-migration";
    }
  | {
      state: "needs-setup";
    };

/** Once ready, skip re-checking on every request until process restart. */
let readyCached = false;

export async function getStartupState(): Promise<StartupState> {
  if (readyCached) {
    return { state: "ready" };
  }

  const database = await checkDatabaseConnection();

  if (!database.success) {
    return {
      state: "database-connection-failed",
      message: database.message,
    };
  }

  const migrations = await checkMigrationStatus();

  if (!migrations) {
    return {
      state: "needs-migration",
    };
  }

  const adminExists = await checkAdminExists();

  if (!adminExists) {
    return {
      state: "needs-setup",
    };
  }

  readyCached = true;
  return {
    state: "ready",
  };
}
