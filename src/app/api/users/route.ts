import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import type { CreateUserPayload } from "@/payloads/users";
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

  let body: CreateUserPayload;

  try {
    body = (await request.json()) as CreateUserPayload;
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

  const response = await createUser(body);
  return NextResponse.json(response, { status: response.statusCode });
}
