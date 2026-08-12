/** Map a Zod issue path to a known request field name, if any. */
export function firstIssueField<T extends string>(
  path: PropertyKey | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((value) => value === path);
}
