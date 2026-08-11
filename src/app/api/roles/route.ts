import { NextResponse } from "next/server";

import { canAccessRoute, PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireSession,
} from "@/lib/auth/permissions";
import type { CreateRolePayload } from "@/payloads/roles";
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

  let body: CreateRolePayload;

  try {
    body = (await request.json()) as CreateRolePayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        statusCode: 400,
        message: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const response = await createRole(body);
  return NextResponse.json(response, { status: response.statusCode });
}
