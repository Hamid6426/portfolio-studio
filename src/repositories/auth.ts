import { and, eq, gt, lt, sql } from "drizzle-orm";

import {
  DEFAULT_ROLE_PERMISSIONS,
  serializePermissions,
  type RoleName,
} from "@/config/permissions";
import { db } from "@/db/client";
import { rolesTable, userRefreshTokenTable, userTable } from "@/db/schema";
import { REFRESH_TOKEN_TTL_MS } from "@/lib/auth/constants";
import { firstIssueField } from "@/lib/api/first-issue-field";
import {
  createRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "@/lib/auth/tokens";
import {
  hashPassword,
  needsRehash,
  verifyPassword,
  verifyPasswordDummy,
} from "@/lib/password";
import {
  createAdminPayloadSchema,
  loginPayloadSchema,
} from "@/payloads/auth";
import type {
  CreateAdminResponse,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
} from "@/responses/auth";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import { logError } from "@/lib/logger";

export type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type LoginUserResult = {
  response: LoginResponse;
  tokens?: AuthTokenPair;
};

export type RefreshSessionResult = {
  response: RefreshResponse;
  tokens?: AuthTokenPair;
};

async function issueTokenPair(user: {
  id: string;
  email: string;
  role: string;
}): Promise<AuthTokenPair> {
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = createRefreshToken();

  await db.insert(userRefreshTokenTable).values({
    userId: user.id,
    token: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { accessToken, refreshToken };
}

/** Best-effort cleanup; never blocks login on failure. */
async function sweepExpiredRefreshTokens(): Promise<void> {
  try {
    await db
      .delete(userRefreshTokenTable)
      .where(lt(userRefreshTokenTable.expiresAt, new Date()));
  } catch (error) {
    logError("Expired refresh-token sweep failed:", error);
  }
}

async function ensureRolesInTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<void> {
  for (const roleName of Object.keys(
    DEFAULT_ROLE_PERMISSIONS,
  ) as RoleName[]) {
    const existing = await tx.query.rolesTable.findFirst({
      where: eq(rolesTable.roleName, roleName),
      columns: { id: true },
    });
    if (existing) continue;
    await tx.insert(rolesTable).values({
      roleName,
      permissions: serializePermissions(DEFAULT_ROLE_PERMISSIONS[roleName]),
    });
  }
}

/** Backend auth service + DB access used by API route controllers. */
export async function loginUser(payload: unknown): Promise<LoginUserResult> {
  const parsed = loginPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];

    return {
      response: {
        success: false,
        statusCode: 400,
        field: firstIssueField(issue?.path[0], ["email", "password"] as const),
        message: issue?.message ?? "Please check your details and try again.",
      },
    };
  }

  const { email, password } = parsed.data;

  try {
    await sweepExpiredRefreshTokens();

    const user = await db.query.userTable.findFirst({
      where: eq(userTable.email, email),
    });

    if (!user) {
      await verifyPasswordDummy(password);
      return {
        response: {
          success: false,
          statusCode: 401,
          message:
            "We couldn't find an account with that email and password. Check your details and try again.",
        },
      };
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return {
        response: {
          success: false,
          statusCode: 401,
          message:
            "We couldn't find an account with that email and password. Check your details and try again.",
        },
      };
    }

    if (needsRehash(user.password)) {
      await db
        .update(userTable)
        .set({
          password: await hashPassword(password),
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, user.id));
    }

    const tokens = await issueTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      response: {
        success: true,
        statusCode: 200,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      tokens,
    };
  } catch (error) {
    logError("Login failed:", error);

    return {
      response: apiErrorFromPostgres(
        error,
        "Something went wrong while signing you in. Please try again in a moment.",
      ),
    };
  }
}

/**
 * Rotate refresh token + issue a new access token.
 * The DELETE is the claim — zero rows means the token was already used or expired.
 */
export async function refreshSession(
  rawRefreshToken: string | undefined,
): Promise<RefreshSessionResult> {
  if (!rawRefreshToken) {
    return {
      response: {
        success: false,
        statusCode: 401,
        message: "Your session has expired. Please sign in again.",
      },
    };
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);

  try {
    const claimed = await db
      .delete(userRefreshTokenTable)
      .where(
        and(
          eq(userRefreshTokenTable.token, tokenHash),
          gt(userRefreshTokenTable.expiresAt, new Date()),
        ),
      )
      .returning({ userId: userRefreshTokenTable.userId });

    const claimedRow = claimed[0];
    if (!claimedRow) {
      return {
        response: {
          success: false,
          statusCode: 401,
          message: "Your session has expired. Please sign in again.",
        },
      };
    }

    const user = await db.query.userTable.findFirst({
      where: eq(userTable.id, claimedRow.userId),
    });

    if (!user) {
      return {
        response: {
          success: false,
          statusCode: 401,
          message: "Your session has expired. Please sign in again.",
        },
      };
    }

    const tokens = await issueTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      response: {
        success: true,
        statusCode: 200,
        data: null,
      },
      tokens,
    };
  } catch (error) {
    logError("Refresh failed:", error);

    return {
      response: apiErrorFromPostgres(
        error,
        "Something went wrong while refreshing your session. Please try again.",
      ),
    };
  }
}

export async function logoutSession(
  rawRefreshToken: string | undefined,
): Promise<LogoutResponse> {
  if (rawRefreshToken) {
    try {
      await db
        .delete(userRefreshTokenTable)
        .where(
          eq(userRefreshTokenTable.token, hashRefreshToken(rawRefreshToken)),
        );
    } catch (error) {
      logError("Logout cleanup failed:", error);
    }
  }

  return {
    success: true,
    statusCode: 200,
    data: null,
  };
}

/** Backend auth service + DB access used by API route controllers. */
export async function createAdminUser(
  payload: unknown,
): Promise<CreateAdminResponse> {
  const parsed = createAdminPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];

    return {
      success: false,
      statusCode: 400,
      field: firstIssueField(issue?.path[0], [
        "name",
        "email",
        "password",
        "confirmPassword",
      ] as const),
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  const { name, email, password } = parsed.data;

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('portfolio-studio:setup'))`,
      );

      const admins = await tx
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.role, "admin"))
        .limit(1);

      if (admins.length > 0) {
        return {
          success: false as const,
          statusCode: 409 as const,
          message: "An admin account already exists. Please sign in instead.",
        };
      }

      const existing = await tx.query.userTable.findFirst({
        where: eq(userTable.email, email),
        columns: { id: true },
      });

      if (existing) {
        return {
          success: false as const,
          statusCode: 409 as const,
          field: "email" as const,
          message:
            "An account with this email already exists. Try signing in instead.",
        };
      }

      await ensureRolesInTx(tx);

      await tx.insert(userTable).values({
        name,
        email,
        password: await hashPassword(password),
        role: "admin",
      });

      return {
        success: true as const,
        statusCode: 201 as const,
        data: null,
      };
    });
  } catch (error) {
    logError("Failed to create admin account:", error);

    return apiErrorFromPostgres(
      error,
      "Something went wrong while creating your account. Please try again in a moment.",
    );
  }
}
