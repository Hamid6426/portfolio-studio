import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import { parseBody } from "@/lib/api/parse-body";
import { updateBlockPayloadSchema } from "@/payloads/blocks";
import {
  deleteBlock,
  getBlockResponseById,
  updateBlock,
} from "@/repositories/blocks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireRoutePermission(PERMISSIONS.dashboardBlocks);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await getBlockResponseById(id);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.blocksEdit);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;

  const parsed = await parseBody(request, updateBlockPayloadSchema, {
    fields: [
      "name",
      "description",
      "canBeLayout",
      "children",
      "expectedUpdatedAt",
    ],
  });
  if (!parsed.ok) return parsed.response;

  const response = await updateBlock(id, parsed.data);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.blocksDelete);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await deleteBlock(id);
  return NextResponse.json(response, { status: response.statusCode });
}
