import { afterEach, describe, expect, it } from "vitest";

import { DeckTransferEnvironmentSchema } from "@/server/env";
import { resolveDeckTransferOrigin } from "@/server/transfer/transfer-origin";

const originalTransferOrigin = process.env.DECK_TRANSFER_ORIGIN;

afterEach(() => {
  if (originalTransferOrigin === undefined) {
    delete process.env.DECK_TRANSFER_ORIGIN;
  } else {
    process.env.DECK_TRANSFER_ORIGIN = originalTransferOrigin;
  }
});

describe("deck transfer origins", () => {
  it("uses an HTTPS request origin when no override is configured", () => {
    delete process.env.DECK_TRANSFER_ORIGIN;

    expect(resolveDeckTransferOrigin("https://flashcard-reels.vercel.app/api/decks")).toBe(
      "https://flashcard-reels.vercel.app"
    );
  });

  it("treats an explicitly blank override as unset", () => {
    process.env.DECK_TRANSFER_ORIGIN = "";

    expect(resolveDeckTransferOrigin("https://flashcard-reels.vercel.app/api/decks")).toBe(
      "https://flashcard-reels.vercel.app"
    );
  });

  it("allows private HTTP origins for development", () => {
    process.env.DECK_TRANSFER_ORIGIN = "http://10.173.64.56:3000/path";

    expect(resolveDeckTransferOrigin("http://localhost:3000/api/decks")).toBe(
      "http://10.173.64.56:3000"
    );
  });

  it("rejects public insecure HTTP origins", () => {
    const result = DeckTransferEnvironmentSchema.safeParse({
      DECK_TRANSFER_ORIGIN: "http://example.com",
    });

    expect(result.success).toBe(false);
  });
});
