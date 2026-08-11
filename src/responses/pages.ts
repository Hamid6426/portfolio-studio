import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";

export type PageSummary = {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  layoutId: string | null;
  layoutName: string | null;
  createdAt: Date | string | null;
  publishedAt: Date | string | null;
};

export type ListPagesResponse =
  | ApiSuccessResponse<PageSummary[]>
  | ApiErrorResponse;

export type PageResponse = ApiSuccessResponse<PageSummary> | ApiErrorResponse;
