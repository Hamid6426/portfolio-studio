"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  blockQueryKey,
  blockRevisionsQueryKey,
  pageQueryKey,
  pageRevisionsQueryKey,
  PAGES_QUERY_KEY,
  BLOCKS_QUERY_KEY,
} from "@/config/storage-keys";
import type { RestoreRevisionPayload } from "@/payloads/revisions";
import type {
  ListRevisionsResponse,
  RevisionEntityType,
} from "@/repositories/revisions";
import type { BlockResponse } from "@/responses/blocks";
import type { PageResponse } from "@/responses/pages";
import {
  listRevisionsRequest,
  restoreRevisionRequest,
} from "@/services/revisions";

export function useRevisionsQuery(
  entityType: RevisionEntityType,
  entityId: string,
  enabled = true,
) {
  return useQuery<ListRevisionsResponse>({
    queryKey:
      entityType === "page"
        ? pageRevisionsQueryKey(entityId)
        : blockRevisionsQueryKey(entityId),
    queryFn: () => listRevisionsRequest(entityType, entityId),
    enabled: enabled && Boolean(entityId),
  });
}

export function useRestoreRevisionMutation(entityType: RevisionEntityType) {
  const queryClient = useQueryClient();

  return useMutation<
    PageResponse | BlockResponse,
    Error,
    {
      entityId: string;
      revisionId: string;
      payload: RestoreRevisionPayload;
    }
  >({
    mutationFn: ({ entityId, revisionId, payload }) =>
      restoreRevisionRequest(entityType, entityId, revisionId, payload),
    onSuccess: (result, variables) => {
      if (!result.success) return;
      if (entityType === "page") {
        void queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY });
        void queryClient.invalidateQueries({
          queryKey: pageQueryKey(variables.entityId),
        });
        void queryClient.invalidateQueries({
          queryKey: pageRevisionsQueryKey(variables.entityId),
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });
        void queryClient.invalidateQueries({
          queryKey: blockQueryKey(variables.entityId),
        });
        void queryClient.invalidateQueries({
          queryKey: blockRevisionsQueryKey(variables.entityId),
        });
      }
    },
  });
}
