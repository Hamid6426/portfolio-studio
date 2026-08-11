import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";

export type RoleSummary = {
  id: string;
  roleName: string;
  permissions: string;
  permissionCount: number;
  userCount: number;
  createdAt: Date | string | null;
};

export type ListRolesResponse =
  | ApiSuccessResponse<RoleSummary[]>
  | ApiErrorResponse;

export type RoleResponse = ApiSuccessResponse<RoleSummary> | ApiErrorResponse;
