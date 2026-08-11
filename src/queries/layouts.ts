"use client";

import { useQuery } from "@tanstack/react-query";

import { LAYOUTS_QUERY_KEY } from "@/config/storage-keys";
import type { ListLayoutsResponse } from "@/responses/layouts";
import { listLayoutsRequest } from "@/services/layouts";

export function useLayoutsQuery() {
  return useQuery<ListLayoutsResponse>({
    queryKey: LAYOUTS_QUERY_KEY,
    queryFn: listLayoutsRequest,
  });
}
