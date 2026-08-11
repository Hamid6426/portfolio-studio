import { redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import {
  ensureDefaultRoles,
  getRolePermissions,
} from "@/repositories/roles";

import { UsersPageClient } from "./users-page-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getAccessSession();
  if (!session) {
    redirect("/login?next=/dashboard/users");
  }

  await ensureDefaultRoles();
  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/users")) {
    redirect("/dashboard/overview");
  }

  return (
    <UsersPageClient
      permissions={permissions}
      currentUserId={session.sub}
    />
  );
}
