import { eq } from "drizzle-orm";
import postgres from "postgres";
import { beforeAll } from "vitest";

import type { RoleName } from "@/config/permissions";
import { db } from "@/db/client";
import { rolesTable, userTable } from "@/db/schema";
import { signAccessToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/password";
import { ensureDefaultRoles } from "@/repositories/roles";

/**
 * Cookie value used by the mocked `next/headers` `cookies()` jar for
 * {@link signInAs}. Cleared on `signOut`.
 *
 * The mock itself lives in each integration test file (Vitest hoisting) and
 * reads this module's getters.
 */
let accessToken: string | null = null;

export function getIntegrationAccessToken(): string | null {
  return accessToken;
}

let dbAvailable: boolean | null = null;

/** True when `DATABASE_URL` accepts connections (local `portfolio_studio_test`). */
export async function isIntegrationDbAvailable(): Promise<boolean> {
  if (dbAvailable !== null) return dbAvailable;
  const url = process.env.DATABASE_URL;
  if (!url) {
    dbAvailable = false;
    return false;
  }
  try {
    const client = postgres(url, { max: 1, connect_timeout: 3 });
    await client`select 1`;
    await client.end({ timeout: 2 });
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
  return dbAvailable;
}

/** Ensure system roles + one user per role exist for the suite. */
export async function ensureIntegrationFixtures(): Promise<void> {
  await ensureDefaultRoles();

  for (const role of ["admin", "editor", "viewer"] as const) {
    const email = `integration-${role}@example.com`;
    const existing = await db.query.userTable.findFirst({
      where: eq(userTable.email, email),
      columns: { id: true },
    });
    if (existing) continue;

    const roleRow = await db.query.rolesTable.findFirst({
      where: eq(rolesTable.roleName, role),
      columns: { roleName: true },
    });
    if (!roleRow) {
      throw new Error(`Missing role fixture: ${role}`);
    }

    await db.insert(userTable).values({
      email,
      name: `Integration ${role}`,
      role,
      password: await hashPassword("IntegrationTestPassword1!"),
    });
  }
}

/**
 * Mint an access cookie for the integration user of `role`.
 * Route handlers then see a real verified JWT via `getAccessSession`.
 */
export async function signInAs(role: RoleName): Promise<{
  userId: string;
  email: string;
  role: RoleName;
}> {
  const email = `integration-${role}@example.com`;
  const user = await db.query.userTable.findFirst({
    where: eq(userTable.email, email),
    columns: { id: true, email: true, role: true },
  });
  if (!user) {
    throw new Error(
      `No integration user for role "${role}". Call ensureIntegrationFixtures first.`,
    );
  }

  accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { userId: user.id, email: user.email, role: role };
}

export function signOut(): void {
  accessToken = null;
}

/** Shared `beforeAll` for integration files — no-op when DB is down. */
export function setupIntegrationSuite(): void {
  beforeAll(async () => {
    if (!(await isIntegrationDbAvailable())) {
      return;
    }
    await ensureIntegrationFixtures();
  });
}

export async function readJson(
  response: Response,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body };
}
