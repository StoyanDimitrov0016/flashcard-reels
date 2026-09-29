import { afterEach, describe, expect, it, vi } from "vitest";

import { getDeckStorageEnvironment } from "@/server/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("deck storage environment", () => {
  it("reads R2 from the configured channel", () => {
    vi.stubEnv("LOCAL_DECKS_DIR", "");
    vi.stubEnv("DECK_CHANNEL", "dev");

    expect(getDeckStorageEnvironment()).toEqual({ channel: "dev", kind: "r2" });
  });

  it("refuses to read R2 without an explicit channel", () => {
    vi.stubEnv("LOCAL_DECKS_DIR", "");
    vi.stubEnv("DECK_CHANNEL", "");

    expect(() => getDeckStorageEnvironment()).toThrow();
  });

  it("serves a local folder in development without a channel", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOCAL_DECKS_DIR", "fixtures/decks");
    vi.stubEnv("DECK_CHANNEL", "");

    expect(getDeckStorageEnvironment()).toEqual({ directory: "fixtures/decks", kind: "local" });
  });
});
