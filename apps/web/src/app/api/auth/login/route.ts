import { type NextRequest, NextResponse } from "next/server";

import { isValidInternalPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = form.get("password");
  if (typeof password !== "string" || !isValidInternalPassword(password)) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(sessionCookie.name, await createSessionToken(), {
    httpOnly: true,
    maxAge: sessionCookie.maxAge,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
