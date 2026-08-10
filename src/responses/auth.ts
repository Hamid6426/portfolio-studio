import type { ApiErrorResponse, ApiSuccessResponse } from "./common";

export type AuthUserData = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type LoginResponse =
  | ApiSuccessResponse<AuthUserData>
  | ApiErrorResponse;

export type CreateAdminResponse = ApiSuccessResponse<null> | ApiErrorResponse;

export type RefreshResponse = ApiSuccessResponse<null> | ApiErrorResponse;

export type LogoutResponse = ApiSuccessResponse<null> | ApiErrorResponse;
