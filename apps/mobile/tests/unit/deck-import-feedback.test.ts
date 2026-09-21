import { describe, expect, it } from "vitest";

import {
  DeckPackageValidationError,
  DeckPackageVersionError,
  type DeckInstallResult,
} from "@/features/decks/deck-installer";
import { shouldInvalidateDeckContent } from "@/features/decks/presentation/deck-content-invalidation";
import {
  getDeckImportErrorFeedback,
  getDeckImportResultFeedback,
} from "@/features/decks/presentation/deck-import-feedback";
import { OperationError } from "@/shared/errors/operation-error";

const resultMessages: Record<DeckInstallResult["status"], string> = {
  installed: "Deck installed.",
  "no-op": "Deck is already current.",
  updated: "Deck updated.",
};

describe("deck import presentation feedback", () => {
  it.each<DeckInstallResult>([
    { deckId: "deck", status: "installed", version: 1 },
    { deckId: "deck", status: "updated", version: 2 },
    { deckId: "deck", status: "no-op", version: 2 },
  ])("maps the %s result to concise feedback", (result) => {
    const feedback = getDeckImportResultFeedback(result);

    expect(feedback.tone).toBe("success");
    expect(feedback.message).toBe(resultMessages[result.status]);
  });

  it.each<DeckInstallResult>([
    { deckId: "deck", status: "installed", version: 1 },
    { deckId: "deck", status: "updated", version: 2 },
    { deckId: "deck", status: "no-op", version: 2 },
  ])("invalidates shared content only for a material content change", (result) => {
    expect(shouldInvalidateDeckContent(result)).toBe(result.status !== "no-op");
  });

  it.each([
    [
      new OperationError({ code: "DECK_DOWNLOAD_FAILED", message: "HTTP 404" }),
      "Couldn’t download this deck. Check your connection or get a new QR code.",
    ],
    [
      new OperationError({ code: "DECK_DOWNLOAD_TIMED_OUT", message: "timeout" }),
      "The download took too long. Check your connection and scan again.",
    ],
    [new DeckPackageValidationError("malformed ZIP"), "That deck package is invalid or damaged."],
    [
      new DeckPackageVersionError("version 1 is older"),
      "That deck package is older than the installed version.",
    ],
    [new Error("SQLite busy: database is locked"), "Could not import deck package. Try again."],
  ])(
    "maps known installer failure categories without exposing technical details",
    (error, message) => {
      const feedback = getDeckImportErrorFeedback(error);

      expect(feedback).toMatchObject({ message, tone: "error" });
      expect(feedback.message).not.toContain(error.message);
    }
  );
});
