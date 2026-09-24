import { type NextRequest, NextResponse } from "next/server";

import { isValidSessionToken, sessionCookie } from "@/server/auth/session";

// The login page posts its server action to /login. /t/<token> links are opened by phones
// without a session and authorize themselves with a signed, short-lived token.
function isPublicPath(path: string): boolean {
  return path === "/login" || path.startsWith("/t/");
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (await isValidSessionToken(request.cookies.get(sessionCookie.name)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname + search);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
