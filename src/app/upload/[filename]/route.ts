import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

import {
  absoluteUploadPath,
  isSafeStoredName,
} from "@/lib/media/storage";
import { findLiveAssetByStoredName } from "@/repositories/assets";

type RouteContext = { params: Promise<{ filename: string }> };

/** Public file serve for assets stored under project-root `upload/`. */
export async function GET(_request: Request, context: RouteContext) {
  const { filename } = await context.params;
  if (!isSafeStoredName(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const asset = await findLiveAssetByStoredName(filename);
  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(absoluteUploadPath(filename));
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
