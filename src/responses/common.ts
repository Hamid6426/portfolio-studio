export type ApiSuccessResponse<T = unknown> = {
  success: true;
  statusCode: number;
  data: T;
  message?: string;
};

export type ApiErrorResponse = {
  success: false;
  statusCode: number;
  message: string;
  field?: string;
};
