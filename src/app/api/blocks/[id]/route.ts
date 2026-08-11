import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
} from "@/lib/auth/permissions";
import type { UpdateBlockPayload } from "@/payloads/blocks";
import { deleteBlock, updateBlock } from "@/repositories/blocks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.blocksEdit);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;

  let body: UpdateBlockPayload;

  try {
    body = (await request.json()) as UpdateBlockPayload;
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

  const response = await updateBlock(id, body);
  return NextResponse.json(response, { status: response.statusCode });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.blocksDelete);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await deleteBlock(id);
  return NextResponse.json(response, { status: response.statusCode });
}
