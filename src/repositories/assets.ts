import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { assetsTable } from "@/db/schema";
import { apiErrorFromPostgres } from "@/lib/db/errors";
import { logError } from "@/lib/logger";
import { isUploadThingEnabled } from "@/lib/media/backend";
import {
  isAllowedImageMime,
  isRemoteAssetUrl,
  removeUploadFile,
  sniffImageMime,
  writeUploadFile,
  type AllowedImageMime,
} from "@/lib/media/storage";
import {
  removeUploadThingFile,
  writeUploadThingFile,
} from "@/lib/media/uploadthing";
import { MAX_UPLOAD_BYTES } from "@/lib/media/constants";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";
import type {
  AssetResponse,
  AssetSummary,
  ListAssetsResponse,
} from "@/responses/assets";

function toSummary(row: {
  id: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadedBy: string | null;
  createdAt: Date | null;
}): AssetSummary {
  return {
    id: row.id,
    storedName: row.storedName,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    url: row.url,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
  };
}

export async function listAssets(): Promise<ListAssetsResponse> {
  try {
    const rows = await db
      .select()
      .from(assetsTable)
      .where(isNull(assetsTable.deletedAt))
      .orderBy(desc(assetsTable.createdAt));

    return {
      success: true,
      statusCode: 200,
      data: rows.map(toSummary),
    };
  } catch (error) {
    logError("assets.list", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while loading media.",
    );
  }
}

export async function createAssetFromUpload(input: {
  bytes: Uint8Array;
  declaredMime: string;
  originalName: string;
  uploadedBy: string | null;
}): Promise<AssetResponse> {
  try {
    if (input.bytes.byteLength === 0) {
      return {
        success: false,
        statusCode: 400,
        message: "The file is empty.",
        field: "file",
      };
    }
    if (input.bytes.byteLength > MAX_UPLOAD_BYTES) {
      return {
        success: false,
        statusCode: 400,
        message: `Images must be ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB or smaller.`,
        field: "file",
      };
    }

    const sniffed = sniffImageMime(input.bytes);
    if (!sniffed) {
      return {
        success: false,
        statusCode: 400,
        message: "Only JPEG, PNG, GIF, WebP, and AVIF images are allowed.",
        field: "file",
      };
    }

    let mimeType: AllowedImageMime = sniffed;
    if (isAllowedImageMime(input.declaredMime)) {
      // Prefer sniffed type when they disagree — header can lie.
      mimeType = sniffed;
    }

    const written = isUploadThingEnabled()
      ? await writeUploadThingFile(input.bytes, mimeType)
      : await writeUploadFile(input.bytes, mimeType);
    const originalName = input.originalName.trim().slice(0, 255) || written.storedName;

    try {
      const [row] = await db
        .insert(assetsTable)
        .values({
          storedName: written.storedName,
          originalName,
          mimeType: written.mimeType,
          sizeBytes: written.sizeBytes,
          url: written.url,
          uploadedBy: input.uploadedBy,
        })
        .returning();

      if (!row) {
        await cleanupWrittenBytes(written.storedName, written.url);
        return {
          success: false,
          statusCode: 500,
          message: "Something went wrong while saving the upload.",
        };
      }

      return {
        success: true,
        statusCode: 201,
        data: toSummary(row),
        message: "Uploaded.",
      };
    } catch (error) {
      await cleanupWrittenBytes(written.storedName, written.url);
      throw error;
    }
  } catch (error) {
    logError("assets.create", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while uploading.",
    );
  }
}

async function cleanupWrittenBytes(
  storedName: string,
  url: string,
): Promise<void> {
  if (isRemoteAssetUrl(url) && isUploadThingEnabled()) {
    await removeUploadThingFile(storedName);
    return;
  }
  await removeUploadFile(storedName);
}

export async function deleteAsset(
  id: string,
): Promise<ApiSuccessResponse<{ id: string }> | ApiErrorResponse> {
  try {
    const existing = await db.query.assetsTable.findFirst({
      where: and(eq(assetsTable.id, id), isNull(assetsTable.deletedAt)),
    });

    if (!existing) {
      return {
        success: false,
        statusCode: 404,
        message: "That file was not found.",
      };
    }

    await db
      .update(assetsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(assetsTable.id, id));

    await cleanupWrittenBytes(existing.storedName, existing.url);

    return {
      success: true,
      statusCode: 200,
      data: { id },
      message: "Deleted.",
    };
  } catch (error) {
    logError("assets.delete", error);
    return apiErrorFromPostgres(
      error,
      "Something went wrong while deleting the file.",
    );
  }
}

/** Resolve a live asset by stored filename for the public file route. */
export async function findLiveAssetByStoredName(storedName: string) {
  return db.query.assetsTable.findFirst({
    where: and(
      eq(assetsTable.storedName, storedName),
      isNull(assetsTable.deletedAt),
    ),
    columns: {
      storedName: true,
      mimeType: true,
      sizeBytes: true,
      originalName: true,
    },
  });
}
