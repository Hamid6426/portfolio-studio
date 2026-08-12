import { NextResponse } from "next/server";

import { canAccessRoute, PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireRoutePermission,
  requireSession,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { createBlockPayloadSchema } from "@/payloads/blocks";
import {
  createBlock,
  listBlocks,
  listLayoutBlocks,
} from "@/repositories/blocks";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const layoutOnly = url.searchParams.get("layout") === "1";

  if (layoutOnly) {
    const auth = await requireSession();
    if (isErrorResponse(auth)) return auth;

    const canList =
      canAccessRoute(auth.permissions, "/dashboard/blocks") ||
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

    const response = await listLayoutBlocks();
    return NextResponse.json(response, { status: response.statusCode });
  }

  const auth = await requireRoutePermission(PERMISSIONS.dashboardBlocks);
  if (isErrorResponse(auth)) return auth;

  const response = await listBlocks();
  return NextResponse.json(response, { status: response.statusCode });
}

export async function POST(request: Request) {
  const auth = await requireButtonPermission(PERMISSIONS.blocksCreate);
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseBody(request, createBlockPayloadSchema, {
    fields: ["name", "description", "canBeLayout", "children"],
  });
  if (!parsed.ok) return parsed.response;

  const response = await createBlock(parsed.data);
  return NextResponse.json(response, { status: response.statusCode });
}
