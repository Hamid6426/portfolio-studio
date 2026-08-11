import { axiosInstance, getApiErrorResponse } from "@/lib/axiosInstance";
import type { ListLayoutsResponse } from "@/responses/layouts";

export async function listLayoutsRequest(): Promise<ListLayoutsResponse> {
  try {
    const { data } =
      await axiosInstance.get<ListLayoutsResponse>("/api/layouts");
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}
