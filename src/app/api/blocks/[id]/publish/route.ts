import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
} from "@/lib/auth/permissions";
import { publishBlock } from "@/repositories/blocks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Publish a layout block's draft tree to the live site. */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireButtonPermission(PERMISSIONS.blocksEdit);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  const response = await publishBlock(id);
  return NextResponse.json(response, { status: response.statusCode });
}
