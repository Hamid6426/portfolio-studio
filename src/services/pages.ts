import { axiosInstance, getApiErrorResponse } from "@/lib/axiosInstance";
import type {
  CreatePagePayload,
  UpdatePagePayload,
} from "@/payloads/pages";
import type { ListPagesResponse, PageResponse } from "@/responses/pages";

export async function listPagesRequest(): Promise<ListPagesResponse> {
  try {
    const { data } = await axiosInstance.get<ListPagesResponse>("/api/pages");
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function createPageRequest(
  payload: CreatePagePayload,
): Promise<PageResponse> {
  try {
    const { data } = await axiosInstance.post<PageResponse>(
      "/api/pages",
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function updatePageRequest(
  id: string,
  payload: UpdatePagePayload,
): Promise<PageResponse> {
  try {
    const { data } = await axiosInstance.patch<PageResponse>(
      `/api/pages/${id}`,
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function deletePageRequest(id: string): Promise<PageResponse> {
  try {
    const { data } = await axiosInstance.delete<PageResponse>(
      `/api/pages/${id}`,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}
