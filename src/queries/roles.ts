"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  ROLES_CREATE_MUTATION_KEY,
  ROLES_DELETE_MUTATION_KEY,
  ROLES_QUERY_KEY,
  ROLES_UPDATE_MUTATION_KEY,
} from "@/config/storage-keys";
import type {
  CreateRolePayload,
  UpdateRolePayload,
} from "@/payloads/roles";
import type { ListRolesResponse, RoleResponse } from "@/responses/roles";
import {
  createRoleRequest,
  deleteRoleRequest,
  listRolesRequest,
  updateRoleRequest,
} from "@/services/roles";

export function useRolesQuery() {
  return useQuery<ListRolesResponse>({
    queryKey: ROLES_QUERY_KEY,
    queryFn: listRolesRequest,
  });
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation<RoleResponse, Error, CreateRolePayload>({
    mutationKey: ROLES_CREATE_MUTATION_KEY,
    mutationFn: createRoleRequest,
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      }
    },
  });
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    RoleResponse,
    Error,
    { id: string; payload: UpdateRolePayload }
  >({
    mutationKey: ROLES_UPDATE_MUTATION_KEY,
    mutationFn: ({ id, payload }) => updateRoleRequest(id, payload),
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      }
    },
  });
}

export function useDeleteRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation<RoleResponse, Error, string>({
    mutationKey: ROLES_DELETE_MUTATION_KEY,
    mutationFn: deleteRoleRequest,
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      }
    },
  });
}
