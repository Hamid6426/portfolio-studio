"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteAssetRequest,
  listAssetsRequest,
  uploadAssetRequest,
} from "@/services/assets";

export const assetsQueryKey = ["assets"] as const;

export function useAssetsQuery(enabled = true) {
  return useQuery({
    queryKey: assetsQueryKey,
    queryFn: listAssetsRequest,
    enabled,
  });
}

export function useUploadAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAssetRequest(file),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: assetsQueryKey });
      }
    },
  });
}

export function useDeleteAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAssetRequest(id),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: assetsQueryKey });
      }
    },
  });
}
