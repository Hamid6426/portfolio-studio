import { NextResponse } from "next/server";

import { setAuthCookies } from "@/lib/auth/cookies";
import type { LoginPayload } from "@/payloads/auth";
import { loginUser } from "@/repositories/auth";

export async function POST(request: Request) {
  let body: LoginPayload;

  try {
    body = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        statusCode: 400,
        message: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const { response, tokens } = await loginUser(body);
  const result = NextResponse.json(response, { status: response.statusCode });

  if (tokens) {
    setAuthCookies(result, tokens);
  }

  return result;
}
