import { notFound, redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import { getPageBySlug } from "@/repositories/pages";
import { pageEditorPath, resolveEditorSlugQuery } from "@/lib/pages/editor-path";
import {
  ensureDefaultRoles,
  getRolePermissions,
} from "@/repositories/roles";

import { PageEditorClient } from "./page-editor-client";

export const dynamic = "force-dynamic";

export default async function PageEditPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string | string[] }>;
}) {
  const { slug: slugParam } = await searchParams;
  const slug = resolveEditorSlugQuery(slugParam);
  const editorPath = pageEditorPath(slug);

  const session = await getAccessSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(editorPath)}`);
  }

  await ensureDefaultRoles();
  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/pages")) {
    redirect("/dashboard/overview");
  }

  const page = await getPageBySlug(slug);
  if (!page.success) {
    notFound();
  }

  return (
    <PageEditorClient pageId={page.data.id} permissions={permissions} />
  );
}
