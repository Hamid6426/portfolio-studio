import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date | string | null;
};

export type ListUsersResponse =
  | ApiSuccessResponse<UserSummary[]>
  | ApiErrorResponse;

export type UserResponse = ApiSuccessResponse<UserSummary> | ApiErrorResponse;
