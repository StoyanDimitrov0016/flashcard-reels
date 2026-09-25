"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { runtimeRoute } from "@/lib/routes";
import { SignInSchema, type SignInValues } from "@/lib/schemas";
import { isValidInternalPassword } from "@/server/auth/password";
import { toSafeReturnPath } from "@/server/auth/return-path";
import { createSessionToken, sessionCookie } from "@/server/auth/session";

export type SignInResult = Readonly<{ error: string }>;

// A small fixed delay makes guessing the shared password slower without affecting real users.
const FailedAttemptDelayMs = 400;

export async function signIn(values: SignInValues): Promise<SignInResult> {
  const parsed = SignInSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Enter the team password." };
  }
  if (!isValidInternalPassword(parsed.data.password)) {
    await new Promise((resolve) => setTimeout(resolve, FailedAttemptDelayMs));
    return { error: "That password is not correct." };
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookie.name, await createSessionToken(), {
    httpOnly: true,
    maxAge: sessionCookie.maxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return redirect(runtimeRoute(toSafeReturnPath(parsed.data.returnTo)));
}
