import { NextResponse } from "next/server";

import { canAccessRoute, PERMISSIONS } from "@/config/permissions";
import {
  isErrorResponse,
  requireButtonPermission,
  requireSession,
} from "@/lib/auth/permissions";
import { MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import { createAssetFromUpload, listAssets } from "@/repositories/assets";

export async function GET() {
  const auth = await requireSession();
  if (isErrorResponse(auth)) return auth;

  const canRead =
    canAccessRoute(auth.permissions, "/dashboard/media") ||
    canAccessRoute(auth.permissions, "/dashboard/pages") ||
    canAccessRoute(auth.permissions, "/dashboard/blocks");

  if (!canRead) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 403,
        message: "You do not have permission to view this.",
      },
      { status: 403 },
    );
  }

  const response = await listAssets();
  return NextResponse.json(response, { status: response.statusCode });
}

export async function POST(request: Request) {
  const auth = await requireButtonPermission(PERMISSIONS.mediaUpload);
  if (isErrorResponse(auth)) return auth;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        statusCode: 400,
        message: "Expected multipart form data with a file field.",
      },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 400,
        field: "file",
        message: "Please choose an image file.",
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 400,
        field: "file",
        message: `Images must be ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB or smaller.`,
      },
      { status: 400 },
    );
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const response = await createAssetFromUpload({
    bytes: buffer,
    declaredMime: file.type || "application/octet-stream",
    originalName: file.name || "upload",
    uploadedBy: auth.session.sub,
  });

  return NextResponse.json(response, { status: response.statusCode });
}
