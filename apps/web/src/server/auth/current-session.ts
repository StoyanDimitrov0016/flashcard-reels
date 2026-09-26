import "server-only";
import { cookies } from "next/headers";

import { isValidSessionToken, sessionCookie } from "@/server/auth/session";

/** Sensitive handlers check the session themselves instead of relying only on the proxy. */
export async function hasValidSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSessionToken(cookieStore.get(sessionCookie.name)?.value);
}
