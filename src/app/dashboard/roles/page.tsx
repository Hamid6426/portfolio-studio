import { redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import {
  ensureDefaultRoles,
  getRolePermissions,
} from "@/repositories/roles";

import { RolesPageClient } from "./roles-page-client";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const session = await getAccessSession();
  if (!session) {
    redirect("/login?next=/dashboard/roles");
  }

  await ensureDefaultRoles();
  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/roles")) {
    redirect("/dashboard/overview");
  }

  return <RolesPageClient permissions={permissions} />;
}
