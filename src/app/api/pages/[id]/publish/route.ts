import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
} from "@/lib/auth/permissions";
import { publishPage, unpublishPage } from "@/repositories/pages";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Publish state is a sub-resource of a page, so it needs no request body:
 * `POST` puts the page live, `DELETE` takes it down again. Both are gated on
 * `pages-edit` — publishing is an editing act, not a separate capability.
 */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.pagesEdit);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await publishPage(id);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.pagesEdit);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await unpublishPage(id);
  return NextResponse.json(response, { status: response.statusCode });
}
