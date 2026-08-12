"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { UpdateSiteThemePayload } from "@/payloads/themes";
import {
  getSiteThemeRequest,
  updateSiteThemeRequest,
} from "@/services/themes";

export const siteThemeQueryKey = ["site-theme"] as const;

export function useSiteThemeQuery(enabled = true) {
  return useQuery({
    queryKey: siteThemeQueryKey,
    queryFn: getSiteThemeRequest,
    enabled,
  });
}

export function useUpdateSiteThemeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSiteThemePayload) =>
      updateSiteThemeRequest(payload),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.setQueryData(siteThemeQueryKey, response);
      }
    },
  });
}
