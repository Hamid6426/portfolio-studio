import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { createUserPayloadSchema } from "@/payloads/users";
import { createUser, listUsers } from "@/repositories/users";

export async function GET() {
  const auth = await requireRoutePermission(PERMISSIONS.dashboardUsers);
  if (isErrorResponse(auth)) return auth;

  const response = await listUsers();
  return NextResponse.json(response, { status: response.statusCode });
}

export async function POST(request: Request) {
  const auth = await requireButtonPermission(PERMISSIONS.usersCreate);
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseBody(request, createUserPayloadSchema, {
    fields: ["name", "email", "password", "role"],
  });
  if (!parsed.ok) return parsed.response;

  const response = await createUser(parsed.data);
  return NextResponse.json(response, { status: response.statusCode });
}
