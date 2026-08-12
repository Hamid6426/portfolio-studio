/**
 * Minimal structured logger for self-hosted installs.
 * Emits one JSON line per call so journald/docker logs stay greppable.
 * Returns a short error id suitable for echoing to the user.
 */
export function logError(
  scope: string,
  error: unknown,
  meta: Record<string, unknown> = {},
): string {
  const id = crypto.randomUUID().slice(0, 8);
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "unknown error";

  console.error(
    JSON.stringify({
      level: "error",
      id,
      scope,
      message,
      ...meta,
      ...(error instanceof Error && error.stack
        ? { stack: error.stack.split("\n").slice(0, 6) }
        : {}),
    }),
  );

  return id;
}
