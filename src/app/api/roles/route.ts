import { NextResponse } from "next/server";

import { canAccessRoute, PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireSession,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { createRolePayloadSchema } from "@/payloads/roles";
import { createRole, listRoles } from "@/repositories/roles";

export async function GET() {
  const auth = await requireSession();
  if (isErrorResponse(auth)) return auth;

  // Roles list is needed for the users form select as well.
  const canList =
    canAccessRoute(auth.permissions, "/dashboard/roles") ||
    canAccessRoute(auth.permissions, "/dashboard/users");

  if (!canList) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 403,
        message: "You do not have permission to view this.",
      },
      { status: 403 },
    );
  }

  const response = await listRoles();
  return NextResponse.json(response, { status: response.statusCode });
}

export async function POST(request: Request) {
  const auth = await requireButtonPermission(PERMISSIONS.rolesCreate);
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseBody(request, createRolePayloadSchema, {
    fields: ["roleName", "permissions"],
  });
  if (!parsed.ok) return parsed.response;

  const response = await createRole(parsed.data);
  return NextResponse.json(response, { status: response.statusCode });
}
