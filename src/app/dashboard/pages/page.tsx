import { redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import {
  getRolePermissions,
} from "@/repositories/roles";

import { PagesPageClient } from "./pages-page-client";

export const dynamic = "force-dynamic";

export default async function PagesPage() {
  const session = await getAccessSession();
  if (!session) {
    redirect("/login?next=/dashboard/pages");
  }

  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/pages")) {
    redirect("/dashboard");
  }

  return <PagesPageClient permissions={permissions} />;
}
