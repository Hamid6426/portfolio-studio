import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import {
  AUTH_MAX_401_RETRIES,
  AUTH_SKIP_REFRESH_PATHS,
} from "@/lib/auth/constants";
import type { ApiErrorResponse } from "@/responses/common";

type RetryConfig = InternalAxiosRequestConfig & {
  _retryCount?: number;
};

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    // Let the runtime set multipart boundary; the JSON default would break uploads.
    if (config.headers) {
      delete config.headers["Content-Type"];
    }
  }
  return config;
});

/** Shared in-flight refresh so parallel 401s only refresh once. */
let refreshPromise: Promise<boolean> | null = null;

function shouldSkipRefresh(url?: string): boolean {
  if (!url) return false;
  return AUTH_SKIP_REFRESH_PATHS.some((path) => url.includes(path));
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/auth/refresh`,
        undefined,
        { withCredentials: true },
      )
      .then((response) => response.status >= 200 && response.status < 300)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;

    if (
      !config ||
      error.response?.status !== 401 ||
      shouldSkipRefresh(config.url)
    ) {
      return Promise.reject(error);
    }

    const retryCount = config._retryCount ?? 0;
    if (retryCount >= AUTH_MAX_401_RETRIES) {
      return Promise.reject(error);
    }

    config._retryCount = retryCount + 1;

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      return Promise.reject(error);
    }

    return axiosInstance(config);
  },
);

/** Turn an Axios failure into a plain ApiErrorResponse. */
export function getApiErrorResponse(error: unknown): ApiErrorResponse {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<ApiErrorResponse> | undefined;

    if (data?.success === false && typeof data.message === "string") {
      return {
        success: false,
        statusCode: data.statusCode ?? error.response?.status ?? 500,
        field: data.field,
        message: data.message,
      };
    }

    if (error.code === "ERR_NETWORK") {
      return {
        success: false,
        statusCode: 0,
        message:
          "We couldn't reach the server. Check your connection and try again.",
      };
    }

    return {
      success: false,
      statusCode: error.response?.status ?? 500,
      message: "Something went wrong. Please try again in a moment.",
    };
  }

  return {
    success: false,
    statusCode: 500,
    message: "Something went wrong. Please try again in a moment.",
  };
}
