"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sessionCookie } from "@/server/auth/session";

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookie.name);
  redirect("/login");
}
