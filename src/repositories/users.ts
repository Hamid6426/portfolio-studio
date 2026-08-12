import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { userRefreshTokenTable, userTable } from "@/db/schema";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import { hashPassword } from "@/lib/password";
import {
  createUserPayloadSchema,
  updateUserPayloadSchema,
} from "@/payloads/users";
import type {
  ListUsersResponse,
  UserResponse,
  UserSummary,
} from "@/responses/users";
import {
  countUsersWithRole,
  roleExists,
} from "@/repositories/roles";

function toUserSummary(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date | null;
}): UserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function firstIssueField<T extends string>(
  path: PropertyKey | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((value) => value === path);
}

export async function listUsers(): Promise<ListUsersResponse> {
  try {
    const users = await db.query.userTable.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    return {
      success: true,
      statusCode: 200,
      data: users.map(toUserSummary),
    };
  } catch (error) {
    console.error("listUsers failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading users.",
    );
  }
}

export async function createUser(
  payload: unknown,
): Promise<UserResponse> {
  const parsed = createUserPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      statusCode: 400,
      field: firstIssueField(issue?.path[0], [
        "name",
        "email",
        "password",
        "role",
      ] as const),
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  const { name, email, password, role } = parsed.data;

  try {
    if (!(await roleExists(role))) {
      return {
        success: false,
        statusCode: 400,
        field: "role",
        message: "Please choose a valid role.",
      };
    }

    const existing = await db.query.userTable.findFirst({
      where: eq(userTable.email, email),
      columns: { id: true },
    });

    if (existing) {
      return {
        success: false,
        statusCode: 409,
        field: "email",
        message: "An account with this email already exists.",
      };
    }

    const [created] = await db
      .insert(userTable)
      .values({
        name,
        email,
        password: await hashPassword(password),
        role,
      })
      .returning({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        createdAt: userTable.createdAt,
      });

    if (!created) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while creating the user.",
      };
    }

    return {
      success: true,
      statusCode: 201,
      data: toUserSummary(created),
      message: "User created.",
    };
  } catch (error) {
    console.error("createUser failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while creating the user.",
    );
  }
}

export async function updateUser(
  id: string,
  payload: unknown,
  actorUserId: string,
): Promise<UserResponse> {
  const parsed = updateUserPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      statusCode: 400,
      field: firstIssueField(issue?.path[0], [
        "name",
        "email",
        "password",
        "role",
      ] as const),
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  const { name, email, role, password } = parsed.data;

  try {
    const existing = await db.query.userTable.findFirst({
      where: eq(userTable.id, id),
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "User not found.",
      };
    }

    if (!(await roleExists(role))) {
      return {
        success: false,
        statusCode: 400,
        field: "role",
        message: "Please choose a valid role.",
      };
    }

    if (
      actorUserId === id &&
      existing.role === "admin" &&
      role !== "admin"
    ) {
      return {
        success: false,
        statusCode: 400,
        field: "role",
        message: "You cannot change your own role away from admin.",
      };
    }

    if (existing.role === "admin" && role !== "admin") {
      const adminCount = await countUsersWithRole("admin");
      if (adminCount <= 1) {
        return {
          success: false,
          statusCode: 400,
          field: "role",
          message: "There must be at least one admin account.",
        };
      }
    }

    if (email !== existing.email) {
      const emailTaken = await db.query.userTable.findFirst({
        where: eq(userTable.email, email),
        columns: { id: true },
      });
      if (emailTaken) {
        return {
          success: false,
          statusCode: 409,
          field: "email",
          message: "An account with this email already exists.",
        };
      }
    }

    const updates: {
      name: string;
      email: string;
      role: string;
      password?: string;
      updatedAt: Date;
    } = {
      name,
      email,
      role,
      updatedAt: new Date(),
    };

    if (password && password.length > 0) {
      updates.password = await hashPassword(password);
    }

    const [updated] = await db
      .update(userTable)
      .set(updates)
      .where(eq(userTable.id, id))
      .returning({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        createdAt: userTable.createdAt,
      });

    if (!updated) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while updating the user.",
      };
    }

    // Password change must revoke outstanding sessions.
    if (password && password.length > 0) {
      await db
        .delete(userRefreshTokenTable)
        .where(eq(userRefreshTokenTable.userId, id));
    }

    return {
      success: true,
      statusCode: 200,
      data: toUserSummary(updated),
      message: "User updated.",
    };
  } catch (error) {
    console.error("updateUser failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while updating the user.",
    );
  }
}

export async function deleteUser(
  id: string,
  actorUserId: string,
): Promise<UserResponse> {
  try {
    if (id === actorUserId) {
      return {
        success: false,
        statusCode: 400,
        message: "You cannot delete your own account.",
      };
    }

    const existing = await db.query.userTable.findFirst({
      where: eq(userTable.id, id),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "User not found.",
      };
    }

    if (existing.role === "admin") {
      const adminCount = await countUsersWithRole("admin");
      if (adminCount <= 1) {
        return {
          success: false,
          statusCode: 400,
          message: "You cannot delete the last admin account.",
        };
      }
    }

    await db
      .delete(userRefreshTokenTable)
      .where(eq(userRefreshTokenTable.userId, id));

    await db.delete(userTable).where(eq(userTable.id, id));

    return {
      success: true,
      statusCode: 200,
      data: toUserSummary(existing),
      message: "User deleted.",
    };
  } catch (error) {
    console.error("deleteUser failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while deleting the user.",
    );
  }
}
