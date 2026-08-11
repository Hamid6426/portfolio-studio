"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  BLOCKS_CREATE_MUTATION_KEY,
  BLOCKS_DELETE_MUTATION_KEY,
  BLOCKS_LAYOUT_QUERY_KEY,
  BLOCKS_QUERY_KEY,
  BLOCKS_UPDATE_MUTATION_KEY,
} from "@/config/storage-keys";
import type {
  CreateBlockPayload,
  UpdateBlockPayload,
} from "@/payloads/blocks";
import type { BlockResponse, ListBlocksResponse } from "@/responses/blocks";
import {
  createBlockRequest,
  deleteBlockRequest,
  listBlocksRequest,
  listLayoutBlocksRequest,
  updateBlockRequest,
} from "@/services/blocks";

export function useBlocksQuery() {
  return useQuery<ListBlocksResponse>({
    queryKey: BLOCKS_QUERY_KEY,
    queryFn: listBlocksRequest,
  });
}

export function useLayoutBlocksQuery() {
  return useQuery<ListBlocksResponse>({
    queryKey: BLOCKS_LAYOUT_QUERY_KEY,
    queryFn: listLayoutBlocksRequest,
  });
}

function invalidateBlockQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: BLOCKS_LAYOUT_QUERY_KEY });
}

export function useCreateBlockMutation() {
  const queryClient = useQueryClient();

  return useMutation<BlockResponse, Error, CreateBlockPayload>({
    mutationKey: BLOCKS_CREATE_MUTATION_KEY,
    mutationFn: createBlockRequest,
    onSuccess: (result) => {
      if (result.success) invalidateBlockQueries(queryClient);
    },
  });
}

export function useUpdateBlockMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    BlockResponse,
    Error,
    { id: string; payload: UpdateBlockPayload }
  >({
    mutationKey: BLOCKS_UPDATE_MUTATION_KEY,
    mutationFn: ({ id, payload }) => updateBlockRequest(id, payload),
    onSuccess: (result) => {
      if (result.success) invalidateBlockQueries(queryClient);
    },
  });
}

export function useDeleteBlockMutation() {
  const queryClient = useQueryClient();

  return useMutation<BlockResponse, Error, string>({
    mutationKey: BLOCKS_DELETE_MUTATION_KEY,
    mutationFn: deleteBlockRequest,
    onSuccess: (result) => {
      if (result.success) invalidateBlockQueries(queryClient);
    },
  });
}
