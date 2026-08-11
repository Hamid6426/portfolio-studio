import { axiosInstance, getApiErrorResponse } from "@/lib/axiosInstance";
import type {
  CreateUserPayload,
  UpdateUserPayload,
} from "@/payloads/users";
import type {
  ListUsersResponse,
  UserResponse,
} from "@/responses/users";

export async function listUsersRequest(): Promise<ListUsersResponse> {
  try {
    const { data } = await axiosInstance.get<ListUsersResponse>("/api/users");
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function createUserRequest(
  payload: CreateUserPayload,
): Promise<UserResponse> {
  try {
    const { data } = await axiosInstance.post<UserResponse>(
      "/api/users",
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function updateUserRequest(
  id: string,
  payload: UpdateUserPayload,
): Promise<UserResponse> {
  try {
    const { data } = await axiosInstance.patch<UserResponse>(
      `/api/users/${id}`,
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function deleteUserRequest(id: string): Promise<UserResponse> {
  try {
    const { data } = await axiosInstance.delete<UserResponse>(
      `/api/users/${id}`,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}
