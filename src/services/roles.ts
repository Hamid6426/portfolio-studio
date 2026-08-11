import { axiosInstance, getApiErrorResponse } from "@/lib/axiosInstance";
import type {
  CreateRolePayload,
  UpdateRolePayload,
} from "@/payloads/roles";
import type {
  ListRolesResponse,
  RoleResponse,
} from "@/responses/roles";

export async function listRolesRequest(): Promise<ListRolesResponse> {
  try {
    const { data } = await axiosInstance.get<ListRolesResponse>("/api/roles");
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function createRoleRequest(
  payload: CreateRolePayload,
): Promise<RoleResponse> {
  try {
    const { data } = await axiosInstance.post<RoleResponse>(
      "/api/roles",
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function updateRoleRequest(
  id: string,
  payload: UpdateRolePayload,
): Promise<RoleResponse> {
  try {
    const { data } = await axiosInstance.patch<RoleResponse>(
      `/api/roles/${id}`,
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function deleteRoleRequest(id: string): Promise<RoleResponse> {
  try {
    const { data } = await axiosInstance.delete<RoleResponse>(
      `/api/roles/${id}`,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}
