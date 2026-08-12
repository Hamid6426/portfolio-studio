/** True when the value is nullish or only whitespace. */
export function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

/** Trimmed string, or `undefined` when blank. */
export function emptyToUndefined(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Uppercase the first character of each whitespace-separated word. */
export function capitalizeWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** `create-admin` → `Create Admin` */
export function humanizeKebab(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Truncate with an ellipsis when longer than `max` (min 1). */
export function truncate(value: string, max: number): string {
  if (max < 1 || value.length <= max) return value;
  if (max === 1) return "…";
  return `${value.slice(0, max - 1)}…`;
}
