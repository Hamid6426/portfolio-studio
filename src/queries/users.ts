"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  USERS_CREATE_MUTATION_KEY,
  USERS_DELETE_MUTATION_KEY,
  USERS_QUERY_KEY,
  USERS_UPDATE_MUTATION_KEY,
} from "@/config/storage-keys";
import type {
  CreateUserPayload,
  UpdateUserPayload,
} from "@/payloads/users";
import type { ListUsersResponse, UserResponse } from "@/responses/users";
import {
  createUserRequest,
  deleteUserRequest,
  listUsersRequest,
  updateUserRequest,
} from "@/services/users";

export function useUsersQuery() {
  return useQuery<ListUsersResponse>({
    queryKey: USERS_QUERY_KEY,
    queryFn: listUsersRequest,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<UserResponse, Error, CreateUserPayload>({
    mutationKey: USERS_CREATE_MUTATION_KEY,
    mutationFn: createUserRequest,
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      }
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    UserResponse,
    Error,
    { id: string; payload: UpdateUserPayload }
  >({
    mutationKey: USERS_UPDATE_MUTATION_KEY,
    mutationFn: ({ id, payload }) => updateUserRequest(id, payload),
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      }
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<UserResponse, Error, string>({
    mutationKey: USERS_DELETE_MUTATION_KEY,
    mutationFn: deleteUserRequest,
    onSuccess: (result) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      }
    },
  });
}
