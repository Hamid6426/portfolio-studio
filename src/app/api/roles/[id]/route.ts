import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { updateRolePayloadSchema } from "@/payloads/roles";
import { deleteRole, updateRolePermissions } from "@/repositories/roles";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.rolesEdit);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;

  const parsed = await parseBody(request, updateRolePayloadSchema, {
    fields: ["permissions"],
  });
  if (!parsed.ok) return parsed.response;

  const response = await updateRolePermissions(id, parsed.data);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.rolesDelete);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await deleteRole(id);
  return NextResponse.json(response, { status: response.statusCode });
}
