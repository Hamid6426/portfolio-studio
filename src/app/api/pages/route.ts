import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { createPagePayloadSchema } from "@/payloads/pages";
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

  const parsed = await parseBody(request, createPagePayloadSchema, {
    fields: ["title", "slug", "description", "blockId", "content"],
  });
  if (!parsed.ok) return parsed.response;

  const response = await createPage(parsed.data);
  return NextResponse.json(response, { status: response.statusCode });
}
