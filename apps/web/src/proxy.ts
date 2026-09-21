import { type NextRequest, NextResponse } from "next/server";

import { isValidSessionToken, sessionCookie } from "@/lib/auth/session";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"]);

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.has(path) || path.startsWith("/t/")) {
    return NextResponse.next();
  }

  const authenticated = await isValidSessionToken(request.cookies.get(sessionCookie.name)?.value);
  if (authenticated) {
    return NextResponse.next();
  }

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
