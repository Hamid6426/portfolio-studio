import { NextResponse } from "next/server";

import {
  canAccessRoute,
  canShowButton,
  type ButtonPermission,
  type RoutePermission,
} from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import type { AccessTokenPayload } from "@/lib/auth/tokens";
import { getRolePermissions } from "@/repositories/roles";
import type { ApiErrorResponse } from "@/responses/common";

export type AuthorizedSession = {
  session: AccessTokenPayload;
  permissions: string;
};

function unauthorized(
  statusCode: 401 | 403,
  message: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      statusCode,
      message,
    },
    { status: statusCode },
  );
}

/** Load session + role permissions, or return an error response. */
export async function requireSession(): Promise<
  AuthorizedSession | NextResponse<ApiErrorResponse>
> {
  const session = await getAccessSession();
  if (!session) {
    return unauthorized(401, "Please sign in to continue.");
  }

  const permissions = await getRolePermissions(session.role);
  return { session, permissions };
}

export async function requireRoutePermission(
  route: RoutePermission,
): Promise<AuthorizedSession | NextResponse<ApiErrorResponse>> {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const pathname = route.slice("route:".length);
  if (!canAccessRoute(auth.permissions, pathname)) {
    return unauthorized(403, "You do not have permission to view this.");
  }

  return auth;
}

export async function requireButtonPermission(
  button: ButtonPermission,
): Promise<AuthorizedSession | NextResponse<ApiErrorResponse>> {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  if (!canShowButton(auth.permissions, button)) {
    return unauthorized(403, "You do not have permission to do that.");
  }

  return auth;
}

export function isErrorResponse(
  value: AuthorizedSession | NextResponse<ApiErrorResponse>,
): value is NextResponse<ApiErrorResponse> {
  return value instanceof NextResponse;
}
