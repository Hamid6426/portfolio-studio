import { notFound, redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import { getPageById } from "@/repositories/pages";
import {
  ensureDefaultRoles,
  getRolePermissions,
} from "@/repositories/roles";

import { PageEditorClient } from "./page-editor-client";

export const dynamic = "force-dynamic";

export default async function PageEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAccessSession();
  if (!session) {
    redirect(`/login?next=/dashboard/pages/${id}/edit`);
  }

  await ensureDefaultRoles();
  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/pages")) {
    redirect("/dashboard/overview");
  }

  const page = await getPageById(id);
  if (!page.success) {
    notFound();
  }

  return <PageEditorClient pageId={id} />;
}
