/** Dashboard block editor URL. Blocks are addressed by id, not slug. */
export function blockEditorPath(id: string): string {
  const params = new URLSearchParams();
  params.set("id", id);
  return `/dashboard/blocks/edit?${params.toString()}`;
}

export function resolveEditorIdQuery(
  id: string | string[] | undefined,
): string | null {
  const value = Array.isArray(id) ? id[0] : id;
  if (value === undefined || value === "") return null;
  return value;
}
