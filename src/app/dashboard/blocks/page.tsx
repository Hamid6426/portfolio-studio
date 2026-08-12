import { redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import {
  getRolePermissions,
} from "@/repositories/roles";

import { BlocksPageClient } from "./blocks-page-client";

export const dynamic = "force-dynamic";

export default async function BlocksPage() {
  const session = await getAccessSession();
  if (!session) {
    redirect("/login?next=/dashboard/blocks");
  }

  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/blocks")) {
    redirect("/dashboard");
  }

  return <BlocksPageClient permissions={permissions} />;
}
