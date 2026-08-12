/**
 * Permission keys assigned to roles.
 *
 * Formats:
 * - `route:<path>`   — exact path only
 * - `route:<path>/*` — that path and all nested paths
 * - `button:<id>`    — show/hide a UI control
 *
 * Matching is **longest declared route wins, default deny**: undeclared
 * dashboard paths (e.g. `/dashboard/unknown`) are rejected even for admin.
 * Bare `route:/dashboard` is exact-only and never escalates into children.
 */

export const ROUTE_PERMISSIONS = {
  /** Dashboard shell / redirect target only — not a subtree grant. */
  dashboard: "route:/dashboard",
  dashboardOverview: "route:/dashboard/overview",
  dashboardUsers: "route:/dashboard/users/*",
  dashboardRoles: "route:/dashboard/roles/*",
  dashboardPages: "route:/dashboard/pages/*",
  dashboardBlocks: "route:/dashboard/blocks/*",
  dashboardThemes: "route:/dashboard/themes/*",
  dashboardMedia: "route:/dashboard/media/*",
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
  themesEdit: "button:themes-edit",
  mediaUpload: "button:media-upload",
  mediaDelete: "button:media-delete",
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
    PERMISSIONS.dashboardOverview,
    PERMISSIONS.dashboardPages,
    PERMISSIONS.dashboardBlocks,
    PERMISSIONS.dashboardThemes,
    PERMISSIONS.dashboardMedia,
    PERMISSIONS.login,
    PERMISSIONS.signIn,
    PERMISSIONS.signOut,
    PERMISSIONS.openDashboard,
    PERMISSIONS.pagesCreate,
    PERMISSIONS.pagesEdit,
    PERMISSIONS.pagesDelete,
    PERMISSIONS.blocksCreate,
    PERMISSIONS.blocksEdit,
    PERMISSIONS.blocksDelete,
    PERMISSIONS.themesEdit,
    PERMISSIONS.mediaUpload,
    PERMISSIONS.mediaDelete,
  ],
  viewer: [
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

/**
 * Strip `route:` and a trailing `/*` so API helpers can feed a concrete
 * pathname into {@link canAccessRoute}.
 */
export function routePermissionPathname(route: RoutePermission): string {
  const path = route.slice("route:".length);
  return path.endsWith("/*") ? path.slice(0, -2) : path;
}

/**
 * Does this role's route grants cover `pathname`?
 *
 * Longest declared route in {@link ROUTE_PERMISSIONS} wins; undeclared paths
 * are denied. `route:/dashboard` alone never authorises a child path.
 * Bare `/dashboard` is allowed when the role holds any declared
 * `route:/dashboard…` grant (shell redirect).
 */
export function canAccessRoute(
  permissions: Permission[] | string,
  pathname: string,
): boolean {
  const list =
    typeof permissions === "string" ? parsePermissions(permissions) : permissions;

  const path = pathname.split(/[?#]/, 1)[0] || pathname;

  if (path === "/dashboard") {
    return list.some(
      (permission) =>
        permission === PERMISSIONS.dashboard ||
        (permission.startsWith("route:/dashboard/") &&
          (Object.values(ROUTE_PERMISSIONS) as string[]).includes(permission)),
    );
  }

  let best: {
    permission: RoutePermission;
    baseLength: number;
    exact: boolean;
  } | null = null;

  for (const permission of Object.values(ROUTE_PERMISSIONS)) {
    const route = permission.slice("route:".length);
    const wildcard = route.endsWith("/*");
    const base = wildcard ? route.slice(0, -2) : route;
    const covers = wildcard
      ? path === base || path.startsWith(`${base}/`)
      : path === base;
    if (!covers) continue;

    const baseLength = base.length;
    const exact = !wildcard;
    if (
      !best ||
      baseLength > best.baseLength ||
      (baseLength === best.baseLength && exact && !best.exact)
    ) {
      best = { permission, baseLength, exact };
    }
  }

  if (!best) return false;
  return list.includes(best.permission);
}

export function canShowButton(
  permissions: Permission[] | string,
  button: ButtonPermission,
): boolean {
  return hasPermission(permissions, button);
}
