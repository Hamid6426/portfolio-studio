import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
} from "@/lib/auth/permissions";
import type { UpdateUserPayload } from "@/payloads/users";
import { deleteUser, updateUser } from "@/repositories/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.usersEdit);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;

  let body: UpdateUserPayload;

  try {
    body = (await request.json()) as UpdateUserPayload;
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

  const response = await updateUser(id, body, auth.session.sub);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.usersDelete);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await deleteUser(id, auth.session.sub);
  return NextResponse.json(response, { status: response.statusCode });
}
