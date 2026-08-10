export type ApiSuccessResponse<T = unknown> = {
  success: true;
  statusCode: number;
  data: T;
  message?: string;
};

export type ApiPaginatedSuccessResponse<T = unknown> = {
  success: true;
  statusCode: number;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

export type ApiErrorResponse = {
  success: false;
  statusCode: number;
  message: string;
  field?: string;
};
