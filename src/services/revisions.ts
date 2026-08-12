import { axiosInstance, getApiErrorResponse } from "@/lib/axiosInstance";
import type { RestoreRevisionPayload } from "@/payloads/revisions";
import type {
  ListRevisionsResponse,
  RevisionEntityType,
  RevisionResponse,
} from "@/repositories/revisions";
import type { BlockResponse } from "@/responses/blocks";
import type { PageResponse } from "@/responses/pages";

function revisionsBase(entityType: RevisionEntityType, entityId: string) {
  return entityType === "page"
    ? `/api/pages/${entityId}/revisions`
    : `/api/blocks/${entityId}/revisions`;
}

export async function listRevisionsRequest(
  entityType: RevisionEntityType,
  entityId: string,
): Promise<ListRevisionsResponse> {
  try {
    const { data } = await axiosInstance.get<ListRevisionsResponse>(
      revisionsBase(entityType, entityId),
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function getRevisionRequest(
  entityType: RevisionEntityType,
  entityId: string,
  revisionId: string,
): Promise<RevisionResponse> {
  try {
    const { data } = await axiosInstance.get<RevisionResponse>(
      `${revisionsBase(entityType, entityId)}/${revisionId}`,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}

export async function restoreRevisionRequest(
  entityType: RevisionEntityType,
  entityId: string,
  revisionId: string,
  payload: RestoreRevisionPayload,
): Promise<PageResponse | BlockResponse> {
  try {
    const { data } = await axiosInstance.post<PageResponse | BlockResponse>(
      `${revisionsBase(entityType, entityId)}/${revisionId}`,
      payload,
    );
    return data;
  } catch (error) {
    return getApiErrorResponse(error);
  }
}
