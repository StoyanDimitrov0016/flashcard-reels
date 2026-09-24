import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { toSafeReturnPath } from "@/server/auth/return-path";
import { createSessionToken, isValidSessionToken } from "@/server/auth/session";

describe("login return paths", () => {
  it("keeps same-site paths and their query", () => {
    expect(toSafeReturnPath("/decks/abc?view=lessons")).toBe("/decks/abc?view=lessons");
  });

  it.each([
    ["an absolute URL", "https://evil.example/phish"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash trick", "/\\evil.example"],
    ["the login page itself", "/login?next=/"],
    ["nothing", undefined],
  ])("falls back to the catalog for %s", (_name, candidate) => {
    expect(toSafeReturnPath(candidate)).toBe("/");
  });
});

describe("session tokens", () => {
  const originalSecret = process.env.AUTH_SESSION_SECRET;

  beforeEach(() => {
    process.env.AUTH_SESSION_SECRET = "test-session-secret-that-is-at-least-32-characters";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AUTH_SESSION_SECRET;
    } else {
      process.env.AUTH_SESSION_SECRET = originalSecret;
    }
  });

  it("accepts a token it issued until the session expires", async () => {
    const issuedAt = Date.parse("2026-09-25T12:00:00Z");
    const token = await createSessionToken(issuedAt);

    expect(await isValidSessionToken(token, issuedAt + 60_000)).toBe(true);
    expect(await isValidSessionToken(token, issuedAt + 12 * 60 * 60 * 1000 + 1)).toBe(false);
  });

  it("rejects tampered, malformed, and missing tokens", async () => {
    const token = await createSessionToken();
    const [expiresAt, signature] = token.split(".");
    const laterExpiry = String(Number(expiresAt) + 1000);

    expect(await isValidSessionToken(`${laterExpiry}.${signature}`)).toBe(false);
    expect(await isValidSessionToken(`${expiresAt}.not-the-signature`)).toBe(false);
    expect(await isValidSessionToken(`${token}.extra`)).toBe(false);
    expect(await isValidSessionToken(undefined)).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken();
    process.env.AUTH_SESSION_SECRET = "another-session-secret-that-is-32-characters!";

    expect(await isValidSessionToken(token)).toBe(false);
  });
});
