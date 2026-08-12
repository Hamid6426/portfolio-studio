import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { firstIssueField } from "@/lib/api/first-issue-field";
import type { ApiErrorResponse } from "@/responses/common";

type ParseBodyFailure = {
  ok: false;
  response: NextResponse<ApiErrorResponse>;
};

type ParseBodySuccess<T> = {
  ok: true;
  data: T;
};

type ParseBodyOptions<TField extends string> = {
  /** When set, map the first Zod issue to one of these field names. */
  fields?: readonly TField[];
};

/**
 * Read `request.json()` as unknown and validate with Zod before any field access.
 * Malformed JSON and schema failures both become 400 responses.
 */
export async function parseBody<T, TField extends string = string>(
  request: Request,
  schema: ZodType<T>,
  options?: ParseBodyOptions<TField>,
): Promise<ParseBodySuccess<T> | ParseBodyFailure> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          statusCode: 400,
          message: "Request body must be JSON.",
        },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field =
      options?.fields !== undefined
        ? firstIssueField(issue?.path[0], options.fields)
        : typeof issue?.path[0] === "string"
          ? issue.path[0]
          : undefined;
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          statusCode: 400,
          field,
          message: issue?.message ?? "Please check your details and try again.",
        },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
