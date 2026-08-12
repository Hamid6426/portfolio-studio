import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getAccessSession: vi.fn(),
}));

vi.mock("@/repositories/roles", () => ({
  getRolePermissions: vi.fn(),
}));

import { getAccessSession } from "@/lib/auth/session";
import { getRolePermissions } from "@/repositories/roles";
import {
  isErrorResponse,
  requireRoutePermission,
} from "@/lib/auth/permissions";
import {
  ROUTE_PERMISSIONS,
  serializePermissions,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/config/permissions";

const getAccessSessionMock = vi.mocked(getAccessSession);
const getRolePermissionsMock = vi.mocked(getRolePermissions);

describe("requireRoutePermission", () => {
  beforeEach(() => {
    getAccessSessionMock.mockReset();
    getRolePermissionsMock.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    getAccessSessionMock.mockResolvedValue(null);
    const result = await requireRoutePermission(
      ROUTE_PERMISSIONS.dashboardUsers,
    );
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) {
      expect(result.status).toBe(401);
    }
  });

  it("returns 403 when the role lacks the route grant", async () => {
    getAccessSessionMock.mockResolvedValue({
      sub: "u1",
      email: "v@example.com",
      role: "viewer",
      iat: 0,
      exp: 9_999_999_999,
    });
    getRolePermissionsMock.mockResolvedValue(
      serializePermissions(DEFAULT_ROLE_PERMISSIONS.viewer),
    );

    const result = await requireRoutePermission(
      ROUTE_PERMISSIONS.dashboardUsers,
    );
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) {
      expect(result.status).toBe(403);
    }
  });

  it("allows editor pages grant via stripped /* pathname", async () => {
    getAccessSessionMock.mockResolvedValue({
      sub: "u2",
      email: "e@example.com",
      role: "editor",
      iat: 0,
      exp: 9_999_999_999,
    });
    getRolePermissionsMock.mockResolvedValue(
      serializePermissions(DEFAULT_ROLE_PERMISSIONS.editor),
    );

    const result = await requireRoutePermission(
      ROUTE_PERMISSIONS.dashboardPages,
    );
    expect(result).not.toBeInstanceOf(NextResponse);
    if (!isErrorResponse(result)) {
      expect(result.session.role).toBe("editor");
    }
  });

  it("denies editor on users even when feeding the wildcard permission token", async () => {
    getAccessSessionMock.mockResolvedValue({
      sub: "u2",
      email: "e@example.com",
      role: "editor",
      iat: 0,
      exp: 9_999_999_999,
    });
    getRolePermissionsMock.mockResolvedValue(
      serializePermissions(DEFAULT_ROLE_PERMISSIONS.editor),
    );

    const result = await requireRoutePermission(
      ROUTE_PERMISSIONS.dashboardUsers,
    );
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) {
      expect(result.status).toBe(403);
    }
  });
});
