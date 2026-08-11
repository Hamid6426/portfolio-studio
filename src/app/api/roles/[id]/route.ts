import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
} from "@/lib/auth/permissions";
import type { UpdateRolePayload } from "@/payloads/roles";
import { deleteRole, updateRolePermissions } from "@/repositories/roles";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.rolesEdit);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;

  let body: UpdateRolePayload;

  try {
    body = (await request.json()) as UpdateRolePayload;
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

  const response = await updateRolePermissions(id, body);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.rolesDelete);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await deleteRole(id);
  return NextResponse.json(response, { status: response.statusCode });
}
