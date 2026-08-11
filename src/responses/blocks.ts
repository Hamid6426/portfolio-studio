import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";
import type { BlockNode } from "@/db/schema";

export type BlockSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  canBeLayout: boolean;
  childCount: number;
  children: BlockNode[];
  createdAt: Date | string | null;
  publishedAt: Date | string | null;
};

export type ListBlocksResponse =
  | ApiSuccessResponse<BlockSummary[]>
  | ApiErrorResponse;

export type BlockResponse = ApiSuccessResponse<BlockSummary> | ApiErrorResponse;
