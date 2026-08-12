import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
} from "@/lib/auth/permissions";
import { deleteAsset } from "@/repositories/assets";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.mediaDelete);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 400,
        message: "Missing asset id.",
      },
      { status: 400 },
    );
  }

  const response = await deleteAsset(id);
  return NextResponse.json(response, { status: response.statusCode });
}
