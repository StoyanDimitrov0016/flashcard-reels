import { type NextRequest, NextResponse } from "next/server";

import { sessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete(sessionCookie.name);
  return response;
}
