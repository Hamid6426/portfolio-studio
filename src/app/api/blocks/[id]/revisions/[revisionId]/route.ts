import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { restoreRevisionPayloadSchema } from "@/payloads/revisions";
import { updateBlock } from "@/repositories/blocks";
import { getRevision, loadRevisionDocument } from "@/repositories/revisions";

type RouteContext = {
  params: Promise<{ id: string; revisionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireRoutePermission(PERMISSIONS.dashboardBlocks);
  if (isErrorResponse(auth)) return auth;

  const { id, revisionId } = await context.params;
  const response = await getRevision("block", id, revisionId);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.blocksEdit);
  if (isErrorResponse(auth)) return auth;

  const { id, revisionId } = await context.params;
  const parsed = await parseBody(request, restoreRevisionPayloadSchema, {
    fields: ["expectedUpdatedAt"],
  });
  if (!parsed.ok) return parsed.response;

  const loaded = await loadRevisionDocument("block", id, revisionId);
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

  const response = await updateBlock(
    id,
    {
      children: loaded.nodes,
      expectedUpdatedAt: parsed.data.expectedUpdatedAt,
    },
    { userId: auth.session.sub, revisionSource: "restore" },
  );

  return NextResponse.json(response, { status: response.statusCode });
}
