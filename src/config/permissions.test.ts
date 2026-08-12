import { describe, expect, it } from "vitest";

import {
  DEFAULT_ROLE_PERMISSIONS,
  ROUTE_PERMISSIONS,
  canAccessRoute,
  parsePermissions,
  routePermissionPathname,
  serializePermissions,
  type Permission,
} from "@/config/permissions";

describe("parsePermissions", () => {
  it("returns empty for blank input", () => {
    expect(parsePermissions(null)).toEqual([]);
    expect(parsePermissions("")).toEqual([]);
    expect(parsePermissions("   ")).toEqual([]);
  });

  it("keeps only known permission keys", () => {
    expect(
      parsePermissions("route:/dashboard/overview,button:sign-out,route:/evil"),
    ).toEqual(["route:/dashboard/overview", "button:sign-out"]);
  });

  it("drops the old catch-all dashboard tree token", () => {
    expect(parsePermissions("route:/dashboard/*,route:/dashboard/overview")).toEqual(
      ["route:/dashboard/overview"],
    );
  });
});

describe("routePermissionPathname", () => {
  it("strips route: and trailing /* for API checks", () => {
    expect(routePermissionPathname(ROUTE_PERMISSIONS.dashboardUsers)).toBe(
      "/dashboard/users",
    );
    expect(routePermissionPathname(ROUTE_PERMISSIONS.dashboardOverview)).toBe(
      "/dashboard/overview",
    );
  });
});

describe("canAccessRoute", () => {
  const cases: {
    name: string;
    permissions: string[];
    pathname: string;
    expected: boolean;
  }[] = [
    {
      name: "exact overview grant allows overview",
      permissions: ["route:/dashboard/overview"],
      pathname: "/dashboard/overview",
      expected: true,
    },
    {
      name: "exact overview grant does not allow users",
      permissions: ["route:/dashboard/overview"],
      pathname: "/dashboard/users",
      expected: false,
    },
    {
      name: "viewer defaults cannot reach users",
      permissions: DEFAULT_ROLE_PERMISSIONS.viewer,
      pathname: "/dashboard/users",
      expected: false,
    },
    {
      name: "viewer defaults cannot reach roles",
      permissions: DEFAULT_ROLE_PERMISSIONS.viewer,
      pathname: "/dashboard/roles",
      expected: false,
    },
    {
      name: "viewer defaults cannot reach pages",
      permissions: DEFAULT_ROLE_PERMISSIONS.viewer,
      pathname: "/dashboard/pages",
      expected: false,
    },
    {
      name: "pages wildcard allows pages list",
      permissions: ["route:/dashboard/pages/*"],
      pathname: "/dashboard/pages",
      expected: true,
    },
    {
      name: "pages wildcard allows pages editor",
      permissions: ["route:/dashboard/pages/*"],
      pathname: "/dashboard/pages/edit",
      expected: true,
    },
    {
      name: "pages wildcard does not allow users",
      permissions: ["route:/dashboard/pages/*"],
      pathname: "/dashboard/users",
      expected: false,
    },
    {
      name: "legacy bare /dashboard must not escalate",
      permissions: ["route:/dashboard"],
      pathname: "/dashboard/users",
      expected: false,
    },
    {
      name: "bare /dashboard allowed when any dashboard grant is held",
      permissions: ["route:/dashboard/overview"],
      pathname: "/dashboard",
      expected: true,
    },
    {
      name: "editor defaults allow pages edit",
      permissions: DEFAULT_ROLE_PERMISSIONS.editor,
      pathname: "/dashboard/pages/edit",
      expected: true,
    },
    {
      name: "editor defaults allow themes",
      permissions: DEFAULT_ROLE_PERMISSIONS.editor,
      pathname: "/dashboard/themes",
      expected: true,
    },
    {
      name: "viewer defaults deny themes",
      permissions: DEFAULT_ROLE_PERMISSIONS.viewer,
      pathname: "/dashboard/themes",
      expected: false,
    },
    {
      name: "editor defaults deny users",
      permissions: DEFAULT_ROLE_PERMISSIONS.editor,
      pathname: "/dashboard/users",
      expected: false,
    },
    {
      name: "admin defaults allow users",
      permissions: DEFAULT_ROLE_PERMISSIONS.admin,
      pathname: "/dashboard/users",
      expected: true,
    },
    {
      name: "admin defaults deny undeclared /dashboard/unknown",
      permissions: DEFAULT_ROLE_PERMISSIONS.admin,
      pathname: "/dashboard/unknown",
      expected: false,
    },
    {
      name: "admin defaults deny /dashboard/usersX lookalike",
      permissions: DEFAULT_ROLE_PERMISSIONS.admin,
      pathname: "/dashboard/usersX",
      expected: false,
    },
    {
      name: "admin defaults deny /dashboardX",
      permissions: DEFAULT_ROLE_PERMISSIONS.admin,
      pathname: "/dashboardX",
      expected: false,
    },
    {
      name: "path traversal lookalike is denied",
      permissions: DEFAULT_ROLE_PERMISSIONS.admin,
      pathname: "/dashboard/../users",
      expected: false,
    },
    {
      name: "API-style wildcard pathname from requireRoutePermission works",
      permissions: DEFAULT_ROLE_PERMISSIONS.editor,
      pathname: routePermissionPathname(ROUTE_PERMISSIONS.dashboardPages),
      expected: true,
    },
    {
      name: "API-style users pathname denied for editor",
      permissions: DEFAULT_ROLE_PERMISSIONS.editor,
      pathname: routePermissionPathname(ROUTE_PERMISSIONS.dashboardUsers),
      expected: false,
    },
  ];

  for (const row of cases) {
    it(row.name, () => {
      expect(
        canAccessRoute(row.permissions as Permission[], row.pathname),
      ).toBe(row.expected);
    });
  }

  it("accepts serialized permission strings", () => {
    const serialized = serializePermissions(DEFAULT_ROLE_PERMISSIONS.viewer);
    expect(canAccessRoute(serialized, "/dashboard/overview")).toBe(true);
    expect(canAccessRoute(serialized, "/dashboard/users")).toBe(false);
  });
});
