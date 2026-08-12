import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";
import type { BlockNode } from "@/db/schema.types";

export type BlockListItem = {
  id: string;
  name: string;
  description: string;
  canBeLayout: boolean;
  childCount: number;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  publishedAt: Date | string | null;
};

/** Full block record for the editor and GET /api/blocks/:id. */
export type BlockSummary = BlockListItem & {
  children: BlockNode[];
  /** Set when `children` cannot be read on this build. */
  contentUnreadable?: boolean;
  unsupportedVersion?: number;
};

export type ListBlocksResponse =
  | ApiSuccessResponse<BlockListItem[]>
  | ApiErrorResponse;

export type BlockResponse = ApiSuccessResponse<BlockSummary> | ApiErrorResponse;
