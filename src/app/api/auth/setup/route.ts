import { NextResponse } from "next/server";

import { parseBody } from "@/lib/api/parse-body";
import {
  checkLoginRateLimit,
  clientIpFromRequest,
} from "@/lib/auth/login-rate-limit";
import { createAdminPayloadSchema } from "@/payloads/auth";
import { createAdminUser } from "@/repositories/auth";

export async function POST(request: Request) {
  const parsed = await parseBody(request, createAdminPayloadSchema, {
    fields: ["name", "email", "password"],
  });
  if (!parsed.ok) return parsed.response;

  const rate = checkLoginRateLimit(
    clientIpFromRequest(request),
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

  const result = await createAdminUser(parsed.data);

  return NextResponse.json(result, { status: result.statusCode });
}
