import type {
  ApiErrorResponse,
  ApiPaginatedSuccessResponse,
  ApiSuccessResponse,
} from "./common";

export type PortfolioSummary = {
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePortfolioResponse =
  | ApiSuccessResponse<PortfolioSummary>
  | ApiErrorResponse;

export type UpdatePortfolioResponse =
  | ApiSuccessResponse<PortfolioSummary>
  | ApiErrorResponse;

export type ListPortfoliosResponse =
  | ApiPaginatedSuccessResponse<PortfolioSummary>
  | ApiErrorResponse;
