import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { restoreRevisionPayloadSchema } from "@/payloads/revisions";
import { updatePage } from "@/repositories/pages";
import { getRevision, loadRevisionDocument } from "@/repositories/revisions";

type RouteContext = {
  params: Promise<{ id: string; revisionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireRoutePermission(PERMISSIONS.dashboardPages);
  if (isErrorResponse(auth)) return auth;

  const { id, revisionId } = await context.params;
  const response = await getRevision("page", id, revisionId);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.pagesEdit);
  if (isErrorResponse(auth)) return auth;

  const { id, revisionId } = await context.params;
  const parsed = await parseBody(request, restoreRevisionPayloadSchema, {
    fields: ["expectedUpdatedAt"],
  });
  if (!parsed.ok) return parsed.response;

  const loaded = await loadRevisionDocument("page", id, revisionId);
  if (!loaded.ok) {
    return NextResponse.json(
      {
        success: false,
        statusCode: loaded.statusCode,
        message: loaded.message,
      },
      { status: loaded.statusCode },
    );
  }

  const response = await updatePage(
    id,
    {
      content: loaded.nodes,
      expectedUpdatedAt: parsed.data.expectedUpdatedAt,
    },
    { userId: auth.session.sub, revisionSource: "restore" },
  );

  return NextResponse.json(response, { status: response.statusCode });
}
