import { axiosInstance, getApiErrorResponse } from "@/lib/axiosInstance";
import type { UpdateSiteThemePayload } from "@/payloads/themes";
import type { SiteThemeResponse } from "@/responses/themes";

export async function getSiteThemeRequest(): Promise<SiteThemeResponse> {
  try {
    const { data } = await axiosInstance.get<SiteThemeResponse>(
      "/api/site/theme",
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function updateSiteThemeRequest(
  payload: UpdateSiteThemePayload,
): Promise<SiteThemeResponse> {
  try {
    const { data } = await axiosInstance.patch<SiteThemeResponse>(
      "/api/site/theme",
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}
