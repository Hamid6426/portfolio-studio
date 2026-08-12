import { NextResponse } from "next/server";

import { canAccessRoute, PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireSession,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { updateSiteThemePayloadSchema } from "@/payloads/themes";
import { getSiteTheme, updateSiteTheme } from "@/repositories/site-theme";

export async function GET() {
  const auth = await requireSession();
  if (isErrorResponse(auth)) return auth;

  const canRead =
    canAccessRoute(auth.permissions, "/dashboard/themes") ||
    canAccessRoute(auth.permissions, "/dashboard/pages") ||
    canAccessRoute(auth.permissions, "/dashboard/blocks");

  if (!canRead) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 403,
        message: "You do not have permission to view this.",
      },
      { status: 403 },
    );
  }

  const response = await getSiteTheme();
  return NextResponse.json(response, { status: response.statusCode });
}

export async function PATCH(request: Request) {
  const auth = await requireButtonPermission(PERMISSIONS.themesEdit);
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseBody(request, updateSiteThemePayloadSchema, {
    fields: ["themeId", "themeSettings"],
  });
  if (!parsed.ok) return parsed.response;

  const response = await updateSiteTheme(parsed.data);
  return NextResponse.json(response, { status: response.statusCode });
}
