import "server-only";
import { getSessionEnvironment } from "@/server/env";

const SESSION_COOKIE = "flashcard_reels_session";
const SESSION_DURATION_SECONDS = 12 * 60 * 60;
const ExpiryPattern = /^\d+$/;
const Base64UrlPattern = /^[A-Za-z0-9_-]+$/;

export const sessionCookie = { name: SESSION_COOKIE, maxAge: SESSION_DURATION_SECONDS } as const;

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  try {
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function signingKey(): Promise<CryptoKey> {
  const { AUTH_SESSION_SECRET } = getSessionEnvironment();
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SESSION_SECRET),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const expiresAt = String(now + SESSION_DURATION_SECONDS * 1000);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    new TextEncoder().encode(expiresAt)
  );
  return `${expiresAt}.${toBase64Url(signature)}`;
}

export async function isValidSessionToken(
  token: string | undefined,
  now = Date.now()
): Promise<boolean> {
  const [expiresAt, suppliedSignature, extra] = token?.split(".") ?? [];
  if (
    !expiresAt ||
    !suppliedSignature ||
    extra !== undefined ||
    !ExpiryPattern.test(expiresAt) ||
    !Base64UrlPattern.test(suppliedSignature) ||
    Number(expiresAt) <= now
  ) {
    return false;
  }
  const signature = fromBase64Url(suppliedSignature);
  if (!signature) {
    return false;
  }
  // verify() compares in constant time, unlike comparing signature strings.
  return crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    signature,
    new TextEncoder().encode(expiresAt)
  );
}
