import { redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import {
  ensureDefaultRoles,
  getRolePermissions,
} from "@/repositories/roles";

import { LayoutsPageClient } from "./layouts-page-client";

export const dynamic = "force-dynamic";

export default async function LayoutsPage() {
  const session = await getAccessSession();
  if (!session) {
    redirect("/login?next=/dashboard/layouts");
  }

  await ensureDefaultRoles();
  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/layouts")) {
    redirect("/dashboard/overview");
  }

  return <LayoutsPageClient />;
}
