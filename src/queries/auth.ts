"use client";

import { useMutation } from "@tanstack/react-query";

import {
  AUTH_LOGIN_MUTATION_KEY,
  AUTH_LOGOUT_MUTATION_KEY,
  AUTH_SETUP_MUTATION_KEY,
} from "@/config/storage-keys";
import type { CreateAdminPayload, LoginPayload } from "@/payloads/auth";
import type {
  CreateAdminResponse,
  LoginResponse,
  LogoutResponse,
} from "@/responses/auth";
import {
  createAdminRequest,
  loginRequest,
  logoutRequest,
} from "@/services/auth";

export function useLoginMutation() {
  return useMutation<LoginResponse, Error, LoginPayload>({
    mutationKey: AUTH_LOGIN_MUTATION_KEY,
    mutationFn: loginRequest,
  });
}

export function useCreateAdminMutation() {
  return useMutation<CreateAdminResponse, Error, CreateAdminPayload>({
    mutationKey: AUTH_SETUP_MUTATION_KEY,
    mutationFn: createAdminRequest,
  });
}

export function useLogoutMutation() {
  return useMutation<LogoutResponse, Error, void>({
    mutationKey: AUTH_LOGOUT_MUTATION_KEY,
    mutationFn: logoutRequest,
  });
}
