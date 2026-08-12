import { axiosInstance, getApiErrorResponse } from "@/lib/axiosInstance";
import type { AssetResponse, ListAssetsResponse } from "@/responses/assets";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/responses/common";

export async function listAssetsRequest(): Promise<ListAssetsResponse> {
  try {
    const { data } = await axiosInstance.get<ListAssetsResponse>("/api/assets");
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function uploadAssetRequest(
  file: File,
): Promise<AssetResponse> {
  try {
    const body = new FormData();
    body.append("file", file);
    const { data } = await axiosInstance.post<AssetResponse>(
      "/api/assets",
      body,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function deleteAssetRequest(
  id: string,
): Promise<ApiSuccessResponse<{ id: string }> | ApiErrorResponse> {
  try {
    const { data } = await axiosInstance.delete<
      ApiSuccessResponse<{ id: string }> | ApiErrorResponse
    >(`/api/assets/${id}`);
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}
