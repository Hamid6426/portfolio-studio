/** Auth timing / retry behavior (keys live in `config/storage-keys.ts`). */

/** Access JWT lifetime (seconds). */
export const ACCESS_TOKEN_TTL_SEC = 60 * 15; // 15 minutes

/** Refresh token lifetime. */
export const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export const AUTH_SKIP_REFRESH_PATHS = [
  "/api/auth/login",
  "/api/auth/setup",
  "/api/auth/refresh",
  "/api/auth/session/refresh",
  "/api/auth/logout",
] as const;

export const AUTH_MAX_401_RETRIES = 3;
