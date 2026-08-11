/**
 * Permission keys assigned to roles.
 *
 * Formats:
 * - `route:<path>`  — gate access to a route (and nested paths by prefix)
 * - `button:<id>`   — show/hide a UI control
 */

export const ROUTE_PERMISSIONS = {
  dashboard: "route:/dashboard",
  dashboardOverview: "route:/dashboard/overview",
  dashboardUsers: "route:/dashboard/users",
  dashboardRoles: "route:/dashboard/roles",
  dashboardPages: "route:/dashboard/pages",
  dashboardBlocks: "route:/dashboard/blocks",
  setup: "route:/setup",
  setupGuide: "route:/setup-guide",
  login: "route:/login",
} as const;

export const BUTTON_PERMISSIONS = {
  createAdmin: "button:create-admin",
  signIn: "button:sign-in",
  signOut: "button:sign-out",
  openDashboard: "button:open-dashboard",
  usersCreate: "button:users-create",
  usersEdit: "button:users-edit",
  usersDelete: "button:users-delete",
  rolesCreate: "button:roles-create",
  rolesEdit: "button:roles-edit",
  rolesDelete: "button:roles-delete",
  pagesCreate: "button:pages-create",
  pagesEdit: "button:pages-edit",
  pagesDelete: "button:pages-delete",
  blocksCreate: "button:blocks-create",
  blocksEdit: "button:blocks-edit",
  blocksDelete: "button:blocks-delete",
} as const;

export const PERMISSIONS = {
  ...ROUTE_PERMISSIONS,
  ...BUTTON_PERMISSIONS,
} as const;

export type RoutePermission =
  (typeof ROUTE_PERMISSIONS)[keyof typeof ROUTE_PERMISSIONS];
export type ButtonPermission =
  (typeof BUTTON_PERMISSIONS)[keyof typeof BUTTON_PERMISSIONS];
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type RoleName = "admin" | "editor" | "viewer";

export const SYSTEM_ROLE_NAMES: RoleName[] = ["admin", "editor", "viewer"];

/** Default permission sets seeded / assigned per role name. */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  admin: Object.values(PERMISSIONS),
  editor: [
    PERMISSIONS.dashboard,
    PERMISSIONS.dashboardOverview,
    PERMISSIONS.login,
    PERMISSIONS.signIn,
    PERMISSIONS.signOut,
    PERMISSIONS.openDashboard,
  ],
  viewer: [
    PERMISSIONS.dashboard,
    PERMISSIONS.dashboardOverview,
    PERMISSIONS.login,
    PERMISSIONS.signIn,
    PERMISSIONS.signOut,
    PERMISSIONS.openDashboard,
  ],
};

export function serializePermissions(permissions: Permission[]): string {
  return [...new Set(permissions)].join(",");
}

export function parsePermissions(value: string | null | undefined): Permission[] {
  if (!value?.trim()) return [];

  const allowed = new Set<string>(Object.values(PERMISSIONS));

  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is Permission => allowed.has(part));
}

export function hasPermission(
  permissions: Permission[] | string,
  permission: Permission,
): boolean {
  const list =
    typeof permissions === "string" ? parsePermissions(permissions) : permissions;
  return list.includes(permission);
}

/** Route access: exact match or nested under a granted `route:` prefix. */
export function canAccessRoute(
  permissions: Permission[] | string,
  pathname: string,
): boolean {
  const list =
    typeof permissions === "string" ? parsePermissions(permissions) : permissions;

  return list.some((permission) => {
    if (!permission.startsWith("route:")) return false;
    const route = permission.slice("route:".length);
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export function canShowButton(
  permissions: Permission[] | string,
  button: ButtonPermission,
): boolean {
  return hasPermission(permissions, button);
}
