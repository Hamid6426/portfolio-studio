import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import { listLayouts } from "@/repositories/layouts";

export async function GET() {
  const auth = await requireRoutePermission(PERMISSIONS.dashboardLayouts);
  if (isErrorResponse(auth)) return auth;

  const response = await listLayouts();
  return NextResponse.json(response, { status: response.statusCode });
}
