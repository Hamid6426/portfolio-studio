import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE } from "@/config/storage-keys";
import {
  verifyAccessToken,
  type AccessTokenPayload,
} from "@/lib/auth/tokens";

/** Read + verify the access token cookie (server-side). */
export async function getAccessSession(): Promise<AccessTokenPayload | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}
