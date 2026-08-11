import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import { listPages } from "@/repositories/pages";

export async function GET() {
  const auth = await requireRoutePermission(PERMISSIONS.dashboardPages);
  if (isErrorResponse(auth)) return auth;

  const response = await listPages();
  return NextResponse.json(response, { status: response.statusCode });
}
