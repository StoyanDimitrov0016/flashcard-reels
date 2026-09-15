import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDeckTransferToken, readDeckTransferToken } from "@/lib/deck-transfer-token";

const DECK_ID = "7f6f98a7-a84d-4cc8-b744-3d0b53e3c873";
const originalSessionSecret = process.env.AUTH_SESSION_SECRET;

describe("deck transfer tokens", () => {
  beforeEach(() => {
    process.env.AUTH_SESSION_SECRET = "test-session-secret-that-is-at-least-32-characters";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalSessionSecret === undefined) {
      delete process.env.AUTH_SESSION_SECRET;
    } else {
      process.env.AUTH_SESSION_SECRET = originalSessionSecret;
    }
  });

  it("round-trips a signed deck identifier", () => {
    const token = createDeckTransferToken(DECK_ID);

    expect(readDeckTransferToken(token)).toBe(DECK_ID);
  });

  it("rejects a tampered signature", () => {
    const token = createDeckTransferToken(DECK_ID);
    const replacement = token.endsWith("a") ? "b" : "a";
    const tamperedToken = token.slice(0, -1) + replacement;

    expect(readDeckTransferToken(tamperedToken)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = createDeckTransferToken(DECK_ID);
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);

    expect(readDeckTransferToken(token)).toBeNull();
  });
});
