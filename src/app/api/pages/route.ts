import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import type { CreatePagePayload } from "@/payloads/pages";
import { createPage, listPages } from "@/repositories/pages";

export async function GET() {
  const auth = await requireRoutePermission(PERMISSIONS.dashboardPages);
  if (isErrorResponse(auth)) return auth;

  const response = await listPages();
  return NextResponse.json(response, { status: response.statusCode });
}

export async function POST(request: Request) {
  const auth = await requireButtonPermission(PERMISSIONS.pagesCreate);
  if (isErrorResponse(auth)) return auth;

  let body: CreatePagePayload;

  try {
    body = (await request.json()) as CreatePagePayload;
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

  const response = await createPage(body);
  return NextResponse.json(response, { status: response.statusCode });
}
