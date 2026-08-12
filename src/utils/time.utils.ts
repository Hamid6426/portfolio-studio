/** Coerce API/DB timestamps into a valid `Date`, or `null`. */
export function toDate(
  value: Date | string | null | undefined,
): Date | null {
  if (value == null || value === "") return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Short calendar date for dashboard tables (`Jan 5, 2026`).
 * Returns `empty` when the value is missing or invalid.
 */
export function formatDate(
  value: Date | string | null | undefined,
  empty = "—",
): string {
  const date = toDate(value);
  if (!date) return empty;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Medium date + short time for history / audit surfaces.
 * Returns `empty` when the value is missing or invalid.
 */
export function formatDateTime(
  value: Date | string | null | undefined,
  empty = "Unknown time",
): string {
  const date = toDate(value);
  if (!date) return empty;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * ISO-8601 string for concurrent-edit payloads (`expectedUpdatedAt`).
 * Passes through strings; serializes `Date`s.
 */
export function toIsoString(
  value: Date | string | null | undefined,
): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "string") return value;
  return value.toISOString();
}
