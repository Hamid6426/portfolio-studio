import { NextResponse } from "next/server";

import { setAuthCookies } from "@/lib/auth/cookies";
import { parseBody } from "@/lib/api/parse-body";
import { checkLoginRateLimit } from "@/lib/auth/login-rate-limit";
import { loginPayloadSchema } from "@/payloads/auth";
import { loginUser } from "@/repositories/auth";

export async function POST(request: Request) {
  const parsed = await parseBody(request, loginPayloadSchema);
  if (!parsed.ok) return parsed.response;

  const rate = checkLoginRateLimit(
    request.headers.get("x-forwarded-for") ?? "local",
    parsed.data.email,
  );
  if (!rate.ok) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 429,
        message: rate.message,
      },
      { status: 429 },
    );
  }

  const { response, tokens } = await loginUser(parsed.data);
  const result = NextResponse.json(response, { status: response.statusCode });

  if (tokens) {
    setAuthCookies(result, tokens);
  }

  return result;
}
