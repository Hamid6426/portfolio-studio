import { cache } from "react";

import { canAccessRoute, ROUTE_PERMISSIONS, routePermissionPathname } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import { getRolePermissions } from "@/repositories/roles";

/**
 * May the current request see unpublished pages?
 *
 * Reuses the dashboard-pages route permission rather than inventing a new
 * permission key: anyone allowed to manage pages is allowed to preview them.
 * Reads the access-token cookie, so callers are request-scoped and this must
 * never run inside a cached (`unstable_cache`) scope.
 *
 * Wrapped in React `cache` so `generateMetadata` and the page component share
 * one session verify + role lookup per render pass.
 */
export const canPreviewDrafts = cache(async (): Promise<boolean> => {
  const session = await getAccessSession();
  if (!session) return false;

  const permissions = await getRolePermissions(session.role);
  return canAccessRoute(
    permissions,
    routePermissionPathname(ROUTE_PERMISSIONS.dashboardPages),
  );
});
