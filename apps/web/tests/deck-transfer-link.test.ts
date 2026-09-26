import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  hasValidSession: vi.fn(),
  findDeck: vi.fn(),
  createDownload: vi.fn(),
}));

vi.mock("@/server/auth/current-session", () => ({
  hasValidSession: dependencies.hasValidSession,
}));
vi.mock("@/server/decks", () => ({
  getDeckLibrary: () => ({ findDeck: dependencies.findDeck }),
  getDeckStorage: () => ({ createDownload: dependencies.createDownload }),
}));

import { POST } from "@/app/api/decks/[deckId]/transfer-link/route";

const DECK_ID = "7f6f98a7-a84d-4cc8-b744-3d0b53e3c873";
const STORAGE_URL = "https://storage.example.com/decks/test.fcrdeck?signature=test";
const PortalTransferUrlPattern = /^https:\/\/portal\.example\.com\/t\//;

describe("phone transfer links", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("AUTH_SESSION_SECRET", "test-session-secret-that-is-at-least-32-characters");
    dependencies.hasValidSession.mockResolvedValue(true);
    dependencies.findDeck.mockResolvedValue({ id: DECK_ID, key: "decks/test.fcrdeck" });
    dependencies.createDownload.mockResolvedValue({ kind: "redirect", url: STORAGE_URL });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([undefined, ""])(
    "uses HTTPS storage for localhost when the transfer override is %s",
    async (override) => {
      vi.stubEnv("DECK_TRANSFER_ORIGIN", override);
      const response = await POST(
        new Request(`http://localhost:3000/api/decks/${DECK_ID}/transfer-link`, { method: "POST" }),
        { params: Promise.resolve({ deckId: DECK_ID }) }
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ url: STORAGE_URL });
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    }
  );

  it("keeps compact portal links on HTTPS without opening a storage download", async () => {
    vi.stubEnv("DECK_TRANSFER_ORIGIN", "");
    const response = await POST(
      new Request(`https://portal.example.com/api/decks/${DECK_ID}/transfer-link`, {
        method: "POST",
      }),
      { params: Promise.resolve({ deckId: DECK_ID }) }
    );
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    if (typeof body !== "object" || body === null || !("url" in body)) {
      throw new Error("Transfer response is missing its URL");
    }
    expect(body.url).toMatch(PortalTransferUrlPattern);
    expect(dependencies.createDownload).not.toHaveBeenCalled();
  });
});
