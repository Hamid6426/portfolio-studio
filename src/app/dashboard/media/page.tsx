import { redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import { getRolePermissions } from "@/repositories/roles";

import { MediaPageClient } from "./media-page-client";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const session = await getAccessSession();
  if (!session) {
    redirect("/login?next=/dashboard/media");
  }

  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/media")) {
    redirect("/dashboard");
  }

  return <MediaPageClient permissions={permissions} />;
}
