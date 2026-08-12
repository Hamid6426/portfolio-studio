import { headers } from "next/headers";

/**
 * Per-request CSP nonce from `proxy.ts` (`x-nonce`). Present on dynamic
 * renders; absent only if something bypasses the proxy matcher.
 */
export async function getRequestNonce(): Promise<string | undefined> {
  const headerList = await headers();
  return headerList.get("x-nonce") ?? undefined;
}
