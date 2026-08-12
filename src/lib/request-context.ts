import { AsyncLocalStorage } from "node:async_hooks";

type RequestStore = {
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestStore>();

/** Current request id when bound (proxy `x-request-id` or a fresh id). */
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

function bindId(requestId: string): string {
  storage.enterWith({ requestId });
  return requestId;
}

/**
 * Bind the request id for the rest of this async resource (route handler /
 * RSC render). Prefer the proxy-injected `x-request-id` when present.
 *
 * Safe outside a Next request scope (unit tests): falls back to a fresh id.
 */
export async function bindRequestContext(): Promise<string> {
  const existing = storage.getStore()?.requestId;
  if (existing) return existing;

  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const fromHeader = headerList.get("x-request-id")?.trim();
    const requestId =
      fromHeader && fromHeader.length > 0
        ? fromHeader.slice(0, 64)
        : crypto.randomUUID().slice(0, 8);
    return bindId(requestId);
  } catch {
    return bindId(crypto.randomUUID().slice(0, 8));
  }
}
