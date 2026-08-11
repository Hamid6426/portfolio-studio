import { redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import {
  ensureDefaultRoles,
  getRolePermissions,
} from "@/repositories/roles";

import { BlocksPageClient } from "./blocks-page-client";

export const dynamic = "force-dynamic";

export default async function BlocksPage() {
  const session = await getAccessSession();
  if (!session) {
    redirect("/login?next=/dashboard/blocks");
  }

  await ensureDefaultRoles();
  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/blocks")) {
    redirect("/dashboard/overview");
  }

  return <BlocksPageClient permissions={permissions} />;
}
