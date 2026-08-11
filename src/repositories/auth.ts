import { and, eq, gt } from "drizzle-orm";

import { checkAdminExists } from "@/config/setup";
import { db } from "@/db/client";
import { userRefreshTokenTable, userTable } from "@/db/schema";
import { REFRESH_TOKEN_TTL_MS } from "@/lib/auth/constants";
import {
  createRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "@/lib/auth/tokens";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createAdminPayloadSchema,
  loginPayloadSchema,
  type CreateAdminPayload,
  type LoginPayload,
} from "@/payloads/auth";
import type {
  CreateAdminResponse,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
} from "@/responses/auth";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import { ensureDefaultRoles } from "@/repositories/roles";

function firstIssueField<T extends string>(
  path: PropertyKey | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((value) => value === path);
}

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

/** Backend auth service + DB access used by API route controllers. */
export async function loginUser(
  payload: LoginPayload,
): Promise<LoginUserResult> {
  const parsed = loginPayloadSchema.safeParse({
    ...payload,
    email: payload.email.trim().toLowerCase(),
  });

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
    const user = await db.query.userTable.findFirst({
      where: eq(userTable.email, email),
    });

    if (!user || !verifyPassword(password, user.password)) {
      return {
        response: {
          success: false,
          statusCode: 401,
          message:
            "We couldn't find an account with that email and password. Check your details and try again.",
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
    console.error("Login failed:", error);

    return {
      response: apiErrorFromPostgres(
        error,
        "Something went wrong while signing you in. Please try again in a moment.",
      ),
    };
  }
}

/** Rotate refresh token + issue a new access token. */
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
    const stored = await db.query.userRefreshTokenTable.findFirst({
      where: and(
        eq(userRefreshTokenTable.token, tokenHash),
        gt(userRefreshTokenTable.expiresAt, new Date()),
      ),
    });

    if (!stored) {
      return {
        response: {
          success: false,
          statusCode: 401,
          message: "Your session has expired. Please sign in again.",
        },
      };
    }

    const user = await db.query.userTable.findFirst({
      where: eq(userTable.id, stored.userId),
    });

    if (!user) {
      await db
        .delete(userRefreshTokenTable)
        .where(eq(userRefreshTokenTable.id, stored.id));

      return {
        response: {
          success: false,
          statusCode: 401,
          message: "Your session has expired. Please sign in again.",
        },
      };
    }

    // Rotate: remove used refresh token, issue a new pair.
    await db
      .delete(userRefreshTokenTable)
      .where(eq(userRefreshTokenTable.id, stored.id));

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
    console.error("Refresh failed:", error);

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
        .where(eq(userRefreshTokenTable.token, hashRefreshToken(rawRefreshToken)));
    } catch (error) {
      console.error("Logout cleanup failed:", error);
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
  payload: CreateAdminPayload,
): Promise<CreateAdminResponse> {
  const parsed = createAdminPayloadSchema.safeParse({
    ...payload,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
  });

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

  if (await checkAdminExists()) {
    return {
      success: false,
      statusCode: 409,
      message: "An admin account already exists. Please sign in instead.",
    };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.query.userTable.findFirst({
    where: eq(userTable.email, email),
    columns: { id: true },
  });

  if (existing) {
    return {
      success: false,
      statusCode: 409,
      field: "email",
      message:
        "An account with this email already exists. Try signing in instead.",
    };
  }

  try {
    await ensureDefaultRoles();

    await db.insert(userTable).values({
      name,
      email,
      password: hashPassword(password),
      role: "admin",
    });
  } catch (error) {
    console.error("Failed to create admin account:", error);

    return apiErrorFromPostgres(
      error,
      "Something went wrong while creating your account. Please try again in a moment.",
    );
  }

  return {
    success: true,
    statusCode: 201,
    data: null,
  };
}
