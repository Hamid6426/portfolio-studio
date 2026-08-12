import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/responses/common";
import type { BlockNode } from "@/db/schema.types";

export type PageListItem = {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  blockId: string | null;
  blockName: string | null;
  childCount: number;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  publishedAt: Date | string | null;
};

/** Full page record for the editor and GET /api/pages/:id. */
export type PageSummary = PageListItem & {
  content: BlockNode[];
  /** Present on published reads when the snapshot froze a layout tree. */
  layoutChildren?: BlockNode[];
  /** Body tree could not be migrated on this build. */
  contentUnreadable?: boolean;
  unsupportedVersion?: number;
  layoutUnreadable?: boolean;
  layoutUnsupportedVersion?: number;
};

export type ListPagesResponse =
  | ApiSuccessResponse<PageListItem[]>
  | ApiErrorResponse;

export type PageResponse = ApiSuccessResponse<PageSummary> | ApiErrorResponse;
