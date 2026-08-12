import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { updatePagePayloadSchema } from "@/payloads/pages";
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

  const parsed = await parseBody(request, updatePagePayloadSchema, {
    fields: [
      "title",
      "slug",
      "description",
      "blockId",
      "content",
      "expectedUpdatedAt",
    ],
  });
  if (!parsed.ok) return parsed.response;

  const response = await updatePage(id, parsed.data);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.pagesDelete);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await deletePage(id);
  return NextResponse.json(response, { status: response.statusCode });
}
