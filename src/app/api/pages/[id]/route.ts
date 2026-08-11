import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import type { UpdatePagePayload } from "@/payloads/pages";
import { deletePage, getPageById, updatePage } from "@/repositories/pages";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireRoutePermission(PERMISSIONS.dashboardPages);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await getPageById(id);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.pagesEdit);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;

  let body: UpdatePagePayload;

  try {
    body = (await request.json()) as UpdatePagePayload;
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

  const response = await updatePage(id, body);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.pagesDelete);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await deletePage(id);
  return NextResponse.json(response, { status: response.statusCode });
}
