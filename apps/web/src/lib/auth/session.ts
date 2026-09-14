import { getSessionEnvironment } from "@/config/server-environment";

const SESSION_COOKIE = "flashcard_reels_session";
const SESSION_DURATION_SECONDS = 12 * 60 * 60;

function encode(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function signature(expiresAt: string): Promise<string> {
  const { AUTH_SESSION_SECRET } = getSessionEnvironment();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return encode(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(expiresAt)));
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = String(Date.now() + SESSION_DURATION_SECONDS * 1000);
  return `${expiresAt}.${await signature(expiresAt)}`;
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }
  const [expiresAt, suppliedSignature, extra] = token.split(".");
  if (!expiresAt || !suppliedSignature || extra || !/^\d+$/.test(expiresAt)) {
    return false;
  }
  if (Number(expiresAt) <= Date.now()) {
    return false;
  }
  return suppliedSignature === (await signature(expiresAt));
}

export const sessionCookie = { name: SESSION_COOKIE, maxAge: SESSION_DURATION_SECONDS } as const;
