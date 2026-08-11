import { axiosInstance, getApiErrorResponse } from "@/lib/axiosInstance";
import type { ListPagesResponse } from "@/responses/pages";

export async function listPagesRequest(): Promise<ListPagesResponse> {
  try {
    const { data } = await axiosInstance.get<ListPagesResponse>("/api/pages");
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}
