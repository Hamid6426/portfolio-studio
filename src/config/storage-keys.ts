/** Cookie, query, and other client/server storage keys. */

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const AUTH_LOGIN_MUTATION_KEY = ["auth", "login"] as const;
export const AUTH_SETUP_MUTATION_KEY = ["auth", "setup"] as const;
export const AUTH_REFRESH_MUTATION_KEY = ["auth", "refresh"] as const;
export const AUTH_LOGOUT_MUTATION_KEY = ["auth", "logout"] as const;

export const USERS_QUERY_KEY = ["users"] as const;
export const USERS_CREATE_MUTATION_KEY = ["users", "create"] as const;
export const USERS_UPDATE_MUTATION_KEY = ["users", "update"] as const;
export const USERS_DELETE_MUTATION_KEY = ["users", "delete"] as const;

export const ROLES_QUERY_KEY = ["roles"] as const;
export const ROLES_CREATE_MUTATION_KEY = ["roles", "create"] as const;
export const ROLES_UPDATE_MUTATION_KEY = ["roles", "update"] as const;
export const ROLES_DELETE_MUTATION_KEY = ["roles", "delete"] as const;

export const PAGES_QUERY_KEY = ["pages"] as const;
export const PAGES_CREATE_MUTATION_KEY = ["pages", "create"] as const;
export const PAGES_UPDATE_MUTATION_KEY = ["pages", "update"] as const;
export const PAGES_DELETE_MUTATION_KEY = ["pages", "delete"] as const;

export const LAYOUTS_QUERY_KEY = ["layouts"] as const;
