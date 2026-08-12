import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import { listRevisions } from "@/repositories/revisions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireRoutePermission(PERMISSIONS.dashboardPages);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await listRevisions("page", id);
  return NextResponse.json(response, { status: response.statusCode });
}
