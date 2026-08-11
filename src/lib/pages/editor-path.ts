/** Dashboard editor URL: landing uses `?slug=`, other pages `?slug=about-us`. */
export function pageEditorPath(slug: string | null): string {
  const params = new URLSearchParams();
  params.set("slug", slug ?? "");
  return `/dashboard/pages/edit?${params.toString()}`;
}

export function resolveEditorSlugQuery(
  slug: string | string[] | undefined,
): string | null {
  const value = Array.isArray(slug) ? slug[0] : slug;
  if (value === undefined || value === "") return null;
  return value;
}
