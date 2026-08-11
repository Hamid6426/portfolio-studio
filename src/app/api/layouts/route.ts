import { NextResponse } from "next/server";

import { canAccessRoute } from "@/config/permissions";
import {
  isErrorResponse,
  requireSession,
} from "@/lib/auth/permissions";
import { listLayouts } from "@/repositories/layouts";

export async function GET() {
  const auth = await requireSession();
  if (isErrorResponse(auth)) return auth;

  const canList =
    canAccessRoute(auth.permissions, "/dashboard/layouts") ||
    canAccessRoute(auth.permissions, "/dashboard/pages");

  if (!canList) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 403,
        message: "You do not have permission to view this.",
      },
      { status: 403 },
    );
  }

  const response = await listLayouts();
  return NextResponse.json(response, { status: response.statusCode });
}
