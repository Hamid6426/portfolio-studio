import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";

export type AssetSummary = {
  id: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadedBy: string | null;
  createdAt: Date | string | null;
};

export type ListAssetsResponse =
  | ApiSuccessResponse<AssetSummary[]>
  | ApiErrorResponse;

export type AssetResponse = ApiSuccessResponse<AssetSummary> | ApiErrorResponse;
