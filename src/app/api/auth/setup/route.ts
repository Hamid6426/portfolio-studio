import { NextResponse } from "next/server";

import type { CreateAdminPayload } from "@/payloads/auth";
import { createAdminUser } from "@/repositories/auth";

export async function POST(request: Request) {
  let body: CreateAdminPayload;

  try {
    body = (await request.json()) as CreateAdminPayload;
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

  const result = await createAdminUser(body);

  return NextResponse.json(result, { status: result.statusCode });
}
