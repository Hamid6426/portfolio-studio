import { NextResponse } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/config/storage-keys";
import { clearAuthCookies, readCookieValue } from "@/lib/auth/cookies";
import { logoutSession } from "@/repositories/auth";

export async function POST(request: Request) {
  const rawRefreshToken = readCookieValue(
    request.headers.get("cookie"),
    REFRESH_TOKEN_COOKIE,
  );

  const response = await logoutSession(rawRefreshToken);
  const result = NextResponse.json(response, { status: response.statusCode });
  clearAuthCookies(result);

  return result;
}
