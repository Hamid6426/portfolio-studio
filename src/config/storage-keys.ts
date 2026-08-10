/** Cookie, query, and other client/server storage keys. */

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const AUTH_LOGIN_MUTATION_KEY = ["auth", "login"] as const;
export const AUTH_SETUP_MUTATION_KEY = ["auth", "setup"] as const;
export const AUTH_REFRESH_MUTATION_KEY = ["auth", "refresh"] as const;
export const AUTH_LOGOUT_MUTATION_KEY = ["auth", "logout"] as const;
