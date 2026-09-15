import {
  DeckPackageValidationError,
  DeckPackageVersionError,
  type DeckInstallResult,
} from "@/features/decks/deck-installer";

export type DeckImportFeedback = Readonly<{
  message: string;
  tone: "error" | "success";
}>;

export function getDeckImportResultFeedback(result: DeckInstallResult): DeckImportFeedback {
  const messages: Record<DeckInstallResult["status"], string> = {
    installed: "Deck installed.",
    "no-op": "Deck is already current.",
    updated: "Deck updated.",
  };
  return { message: messages[result.status], tone: "success" };
}

export function getDeckImportErrorFeedback(error: unknown): DeckImportFeedback {
  if (error instanceof DeckPackageValidationError) {
    return { message: "That deck package is invalid or damaged.", tone: "error" };
  }
  if (error instanceof DeckPackageVersionError) {
    return { message: "That deck package is older than the installed version.", tone: "error" };
  }
  return { message: "Could not import deck package. Try again.", tone: "error" };
}
