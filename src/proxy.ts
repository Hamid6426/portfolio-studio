import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Expose the current pathname to server components (e.g. the root layout's
  // startup gate) so redirect targets can be excluded from the gate.
  response.headers.set("x-pathname", request.nextUrl.pathname);

  return response;
}

export const config = {
  matcher: "/:path*",
};
