import { axiosInstance, getApiErrorResponse } from "@/lib/axiosInstance";
import type { CreateAdminPayload, LoginPayload } from "@/payloads/auth";
import type {
  CreateAdminResponse,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
} from "@/responses/auth";

/** Frontend auth service — calls API routes via Axios. */
export async function loginRequest(
  payload: LoginPayload,
): Promise<LoginResponse> {
  try {
    const { data } = await axiosInstance.post<LoginResponse>(
      "/api/auth/login",
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function createAdminRequest(
  payload: CreateAdminPayload,
): Promise<CreateAdminResponse> {
  try {
    const { data } = await axiosInstance.post<CreateAdminResponse>(
      "/api/auth/setup",
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function refreshRequest(): Promise<RefreshResponse> {
  try {
    const { data } = await axiosInstance.post<RefreshResponse>(
      "/api/auth/refresh",
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function logoutRequest(): Promise<LogoutResponse> {
  try {
    const { data } = await axiosInstance.post<LogoutResponse>(
      "/api/auth/logout",
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}
