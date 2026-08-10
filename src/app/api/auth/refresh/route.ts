import { NextResponse } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/config/storage-keys";
import {
  clearAuthCookies,
  readCookieValue,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { refreshSession } from "@/repositories/auth";

export async function POST(request: Request) {
  const rawRefreshToken = readCookieValue(
    request.headers.get("cookie"),
    REFRESH_TOKEN_COOKIE,
  );

  const { response, tokens } = await refreshSession(rawRefreshToken);
  const result = NextResponse.json(response, { status: response.statusCode });

  if (tokens) {
    setAuthCookies(result, tokens);
  } else if (!response.success) {
    clearAuthCookies(result);
  }

  return result;
}
