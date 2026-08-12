import { describe, expect, it } from "vitest";

import {
  DEFAULT_ROLE_PERMISSIONS,
  canAccessRoute,
  parsePermissions,
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
      name: "dashboard tree grant covers nested routes",
      permissions: ["route:/dashboard/*"],
      pathname: "/dashboard/users",
      expected: true,
    },
    {
      name: "dashboard tree grant covers overview",
      permissions: ["route:/dashboard/*"],
      pathname: "/dashboard/overview",
      expected: true,
    },
    {
      name: "legacy bare /dashboard must not escalate (exact only)",
      permissions: ["route:/dashboard"],
      pathname: "/dashboard/users",
      expected: false,
    },
    {
      name: "editor defaults allow pages edit",
      permissions: DEFAULT_ROLE_PERMISSIONS.editor,
      pathname: "/dashboard/pages/edit",
      expected: true,
    },
    {
      name: "editor defaults deny users",
      permissions: DEFAULT_ROLE_PERMISSIONS.editor,
      pathname: "/dashboard/users",
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
