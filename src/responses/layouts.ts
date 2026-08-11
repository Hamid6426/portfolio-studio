import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";
import type { LayoutBlock } from "@/db/schema";

export type LayoutSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  blockCount: number;
  structure: LayoutBlock[];
  createdAt: Date | string | null;
  publishedAt: Date | string | null;
};

export type ListLayoutsResponse =
  | ApiSuccessResponse<LayoutSummary[]>
  | ApiErrorResponse;
