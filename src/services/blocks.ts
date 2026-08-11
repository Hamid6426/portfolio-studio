import { axiosInstance, getApiErrorResponse } from "@/lib/axiosInstance";
import type {
  CreateBlockPayload,
  UpdateBlockPayload,
} from "@/payloads/blocks";
import type { BlockResponse, ListBlocksResponse } from "@/responses/blocks";

export async function listBlocksRequest(): Promise<ListBlocksResponse> {
  try {
    const { data } = await axiosInstance.get<ListBlocksResponse>("/api/blocks");
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function listLayoutBlocksRequest(): Promise<ListBlocksResponse> {
  try {
    const { data } = await axiosInstance.get<ListBlocksResponse>(
      "/api/blocks?layout=1",
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function getBlockRequest(id: string): Promise<BlockResponse> {
  try {
    const { data } = await axiosInstance.get<BlockResponse>(
      `/api/blocks/${id}`,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function createBlockRequest(
  payload: CreateBlockPayload,
): Promise<BlockResponse> {
  try {
    const { data } = await axiosInstance.post<BlockResponse>(
      "/api/blocks",
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function updateBlockRequest(
  id: string,
  payload: UpdateBlockPayload,
): Promise<BlockResponse> {
  try {
    const { data } = await axiosInstance.patch<BlockResponse>(
      `/api/blocks/${id}`,
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function deleteBlockRequest(id: string): Promise<BlockResponse> {
  try {
    const { data } = await axiosInstance.delete<BlockResponse>(
      `/api/blocks/${id}`,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}
