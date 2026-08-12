import { count, eq } from "drizzle-orm";

import {
  DEFAULT_ROLE_PERMISSIONS,
  parsePermissions,
  serializePermissions,
  SYSTEM_ROLE_NAMES,
  type Permission,
  type RoleName,
} from "@/config/permissions";
import { db } from "@/db/client";
import { rolesTable, userTable } from "@/db/schema";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import type {
  CreateRolePayload,
  UpdateRolePayload,
} from "@/payloads/roles";
import {
  createRolePayloadSchema,
  updateRolePayloadSchema,
} from "@/payloads/roles";
import type {
  ListRolesResponse,
  RoleResponse,
  RoleSummary,
} from "@/responses/roles";

function toRoleSummary(
  role: {
    id: string;
    roleName: string;
    permissions: string;
    createdAt: Date | null;
  },
  userCount: number,
): RoleSummary {
  const permissions = parsePermissions(role.permissions);
  return {
    id: role.id,
    roleName: role.roleName,
    permissions: role.permissions,
    permissionCount: permissions.length,
    userCount,
    createdAt: role.createdAt,
  };
}

/** Ensure default roles exist. Does not rewrite existing permission strings —
 *  admins can trim grants without them being silently restored on every load. */
export async function ensureDefaultRoles(): Promise<void> {
  for (const roleName of Object.keys(
    DEFAULT_ROLE_PERMISSIONS,
  ) as RoleName[]) {
    const existing = await db.query.rolesTable.findFirst({
      where: eq(rolesTable.roleName, roleName),
      columns: { id: true },
    });

    if (existing) continue;

    await db.insert(rolesTable).values({
      roleName,
      permissions: serializePermissions(DEFAULT_ROLE_PERMISSIONS[roleName]),
    });
  }
}

export async function getRolePermissions(
  roleName: string,
): Promise<string> {
  const role = await db.query.rolesTable.findFirst({
    where: eq(rolesTable.roleName, roleName),
    columns: { permissions: true },
  });

  return role?.permissions ?? "";
}

export async function listRoles(): Promise<ListRolesResponse> {
  try {
    const roles = await db.query.rolesTable.findMany({
      orderBy: (table, { asc }) => [asc(table.roleName)],
    });

    const counts = await db
      .select({
        role: userTable.role,
        value: count(),
      })
      .from(userTable)
      .groupBy(userTable.role);

    const countByRole = new Map(
      counts.map((row) => [row.role, Number(row.value)]),
    );

    return {
      success: true,
      statusCode: 200,
      data: roles.map((role) =>
        toRoleSummary(role, countByRole.get(role.roleName) ?? 0),
      ),
    };
  } catch (error) {
    console.error("listRoles failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading roles.",
    );
  }
}

export async function createRole(
  payload: CreateRolePayload,
): Promise<RoleResponse> {
  const parsed = createRolePayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      statusCode: 400,
      field: issue?.path[0] === "roleName" ? "roleName" : "permissions",
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  const { roleName, permissions } = parsed.data;

  if ((SYSTEM_ROLE_NAMES as string[]).includes(roleName)) {
    return {
      success: false,
      statusCode: 400,
      field: "roleName",
      message: "That role name is reserved. Choose a different name.",
    };
  }

  try {
    const existing = await db.query.rolesTable.findFirst({
      where: eq(rolesTable.roleName, roleName),
      columns: { id: true },
    });

    if (existing) {
      return {
        success: false,
        statusCode: 409,
        field: "roleName",
        message: "A role with that name already exists.",
      };
    }

    const [created] = await db
      .insert(rolesTable)
      .values({
        roleName,
        permissions: serializePermissions(permissions as Permission[]),
      })
      .returning();

    if (!created) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while creating the role.",
      };
    }

    return {
      success: true,
      statusCode: 201,
      data: toRoleSummary(created, 0),
      message: "Role created.",
    };
  } catch (error) {
    console.error("createRole failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while creating the role.",
    );
  }
}

export async function updateRolePermissions(
  id: string,
  payload: UpdateRolePayload,
): Promise<RoleResponse> {
  const parsed = updateRolePayloadSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      statusCode: 400,
      field: "permissions",
      message: issue?.message ?? "Please check your details and try again.",
    };
  }

  try {
    const existing = await db.query.rolesTable.findFirst({
      where: eq(rolesTable.id, id),
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Role not found.",
      };
    }

    const [updated] = await db
      .update(rolesTable)
      .set({
        permissions: serializePermissions(
          parsed.data.permissions as Permission[],
        ),
        updatedAt: new Date(),
      })
      .where(eq(rolesTable.id, id))
      .returning();

    if (!updated) {
      return {
        success: false,
        statusCode: 500,
        message: "Something went wrong while updating the role.",
      };
    }

    const [{ value: userCount } = { value: 0 }] = await db
      .select({ value: count() })
      .from(userTable)
      .where(eq(userTable.role, updated.roleName));

    return {
      success: true,
      statusCode: 200,
      data: toRoleSummary(updated, Number(userCount)),
      message: "Role updated.",
    };
  } catch (error) {
    console.error("updateRolePermissions failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while updating the role.",
    );
  }
}

export async function deleteRole(id: string): Promise<RoleResponse> {
  try {
    const existing = await db.query.rolesTable.findFirst({
      where: eq(rolesTable.id, id),
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "Role not found.",
      };
    }

    if ((SYSTEM_ROLE_NAMES as string[]).includes(existing.roleName)) {
      return {
        success: false,
        statusCode: 400,
        message: "System roles cannot be deleted.",
      };
    }

    const [{ value: userCount } = { value: 0 }] = await db
      .select({ value: count() })
      .from(userTable)
      .where(eq(userTable.role, existing.roleName));

    if (Number(userCount) > 0) {
      return {
        success: false,
        statusCode: 400,
        message:
          "This role still has users assigned. Reassign them before deleting.",
      };
    }

    await db.delete(rolesTable).where(eq(rolesTable.id, id));

    return {
      success: true,
      statusCode: 200,
      data: toRoleSummary(existing, 0),
      message: "Role deleted.",
    };
  } catch (error) {
    console.error("deleteRole failed:", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while deleting the role.",
    );
  }
}

/** Used by role name existence checks. */
export async function roleExists(roleName: string): Promise<boolean> {
  const role = await db.query.rolesTable.findFirst({
    where: eq(rolesTable.roleName, roleName),
    columns: { id: true },
  });
  return Boolean(role);
}

export async function countUsersWithRole(roleName: string): Promise<number> {
  const [{ value } = { value: 0 }] = await db
    .select({ value: count() })
    .from(userTable)
    .where(eq(userTable.role, roleName));
  return Number(value);
}