"use client";

import { useQuery } from "@tanstack/react-query";

import { PAGES_QUERY_KEY } from "@/config/storage-keys";
import type { ListPagesResponse } from "@/responses/pages";
import { listPagesRequest } from "@/services/pages";

export function usePagesQuery() {
  return useQuery<ListPagesResponse>({
    queryKey: PAGES_QUERY_KEY,
    queryFn: listPagesRequest,
  });
}
