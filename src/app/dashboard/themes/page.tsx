import { redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import { getRolePermissions } from "@/repositories/roles";

import { ThemesPageClient } from "./themes-page-client";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const session = await getAccessSession();
  if (!session) {
    redirect("/login?next=/dashboard/themes");
  }

  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/themes")) {
    redirect("/dashboard");
  }

  return <ThemesPageClient permissions={permissions} />;
}
