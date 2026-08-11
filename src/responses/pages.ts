import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";
import type { BlockNode } from "@/db/schema";

export type PageSummary = {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  content: BlockNode[];
  blockId: string | null;
  blockName: string | null;
  createdAt: Date | string | null;
  publishedAt: Date | string | null;
};

export type ListPagesResponse =
  | ApiSuccessResponse<PageSummary[]>
  | ApiErrorResponse;

export type PageResponse = ApiSuccessResponse<PageSummary> | ApiErrorResponse;
