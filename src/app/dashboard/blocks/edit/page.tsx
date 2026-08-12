import { notFound, redirect } from "next/navigation";

import { canAccessRoute } from "@/config/permissions";
import { getAccessSession } from "@/lib/auth/session";
import { blockEditorPath, resolveEditorIdQuery } from "@/lib/blocks/editor-path";
import { getBlockById } from "@/repositories/blocks";
import {
  getRolePermissions,
} from "@/repositories/roles";

import { BlockEditorClient } from "./block-editor-client";

export const dynamic = "force-dynamic";

export default async function BlockEditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id: idParam } = await searchParams;
  const id = resolveEditorIdQuery(idParam);
  const editorPath = blockEditorPath(id ?? "");

  const session = await getAccessSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(editorPath)}`);
  }

  const permissions = await getRolePermissions(session.role);

  if (!canAccessRoute(permissions, "/dashboard/blocks")) {
    redirect("/dashboard/overview");
  }

  if (!id) {
    notFound();
  }

  const block = await getBlockById(id);
  if (!block) {
    notFound();
  }

  return <BlockEditorClient blockId={block.id} permissions={permissions} />;
}
