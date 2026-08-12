import { NextResponse } from "next/server";

import { parseBody } from "@/lib/api/parse-body";
import { createAdminPayloadSchema } from "@/payloads/auth";
import { createAdminUser } from "@/repositories/auth";

export async function POST(request: Request) {
  const parsed = await parseBody(request, createAdminPayloadSchema, {
    fields: ["name", "email", "password"],
  });
  if (!parsed.ok) return parsed.response;

  const result = await createAdminUser(parsed.data);

  return NextResponse.json(result, { status: result.statusCode });
}
