import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { updateUserPayloadSchema } from "@/payloads/users";
import { deleteUser, updateUser } from "@/repositories/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.usersEdit);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;

  const parsed = await parseBody(request, updateUserPayloadSchema, {
    fields: ["name", "email", "password", "role"],
  });
  if (!parsed.ok) return parsed.response;

  const response = await updateUser(id, parsed.data, auth.session.sub);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.usersDelete);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await deleteUser(id, auth.session.sub);
  return NextResponse.json(response, { status: response.statusCode });
}
