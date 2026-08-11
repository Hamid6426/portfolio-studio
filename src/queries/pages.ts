"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  PAGES_CREATE_MUTATION_KEY,
  PAGES_DELETE_MUTATION_KEY,
  PAGES_QUERY_KEY,
  PAGES_UPDATE_MUTATION_KEY,
  pageQueryKey,
} from "@/config/storage-keys";
import type {
  CreatePagePayload,
  UpdatePagePayload,
} from "@/payloads/pages";
import type { ListPagesResponse, PageResponse } from "@/responses/pages";
import {
  createPageRequest,
  deletePageRequest,
  getPageRequest,
  listPagesRequest,
  publishPageRequest,
  unpublishPageRequest,
  updatePageRequest,
} from "@/services/pages";

// These belong beside the other keys in `@/config/storage-keys`, but that file
// is outside this change's scope; move them there when convenient.
const PAGES_PUBLISH_MUTATION_KEY = ["pages", "publish"] as const;
const PAGES_UNPUBLISH_MUTATION_KEY = ["pages", "unpublish"] as const;

export function usePagesQuery() {
  return useQuery<ListPagesResponse>({
    queryKey: PAGES_QUERY_KEY,
    queryFn: listPagesRequest,
  });
}

export function usePageQuery(id: string) {
  return useQuery<PageResponse>({
    queryKey: pageQueryKey(id),
    queryFn: () => getPageRequest(id),
    enabled: Boolean(id),
  });
}

export function useCreatePageMutation() {
  const queryClient = useQueryClient();

  return useMutation<PageResponse, Error, CreatePagePayload>({
    mutationKey: PAGES_CREATE_MUTATION_KEY,
    mutationFn: createPageRequest,
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY });
      }
    },
  });
}

export function useUpdatePageMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    PageResponse,
    Error,
    { id: string; payload: UpdatePagePayload }
  >({
    mutationKey: PAGES_UPDATE_MUTATION_KEY,
    mutationFn: ({ id, payload }) => updatePageRequest(id, payload),
    onSuccess: (result, variables) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY });
        void queryClient.invalidateQueries({
          queryKey: pageQueryKey(variables.id),
        });
      }
    },
  });
}

export function usePublishPageMutation() {
  const queryClient = useQueryClient();

  return useMutation<PageResponse, Error, string>({
    mutationKey: PAGES_PUBLISH_MUTATION_KEY,
    mutationFn: publishPageRequest,
    onSuccess: (result, id) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: pageQueryKey(id) });
      }
    },
  });
}

export function useUnpublishPageMutation() {
  const queryClient = useQueryClient();

  return useMutation<PageResponse, Error, string>({
    mutationKey: PAGES_UNPUBLISH_MUTATION_KEY,
    mutationFn: unpublishPageRequest,
    onSuccess: (result, id) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: pageQueryKey(id) });
      }
    },
  });
}

export function useDeletePageMutation() {
  const queryClient = useQueryClient();

  return useMutation<PageResponse, Error, string>({
    mutationKey: PAGES_DELETE_MUTATION_KEY,
    mutationFn: deletePageRequest,
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY });
      }
    },
  });
}
