import { DeckPackageParseError } from "@flashcard-reels/deck-contract";

import {
  DeckPackageAuthorError,
  DeckPackageRevisionError,
  type DeckInstallResult,
} from "@/features/decks/deck-installer";
import { AppError } from "@/shared/errors/app-error";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";

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
  if (error instanceof AppError && error.code === "DECK_DOWNLOAD_TIMED_OUT") {
    return {
      message: getErrorFeedback(error).message,
      tone: "error",
    };
  }
  if (
    error instanceof AppError &&
    ["DECK_DOWNLOAD_FAILED", "DECK_DOWNLOAD_EXPIRED", "DECK_DOWNLOAD_UNAVAILABLE"].includes(
      error.code
    )
  ) {
    return {
      message: getErrorFeedback(error).message,
      tone: "error",
    };
  }
  if (error instanceof DeckPackageParseError) {
    return { message: getErrorFeedback(error).message, tone: "error" };
  }
  if (error instanceof DeckPackageRevisionError) {
    return { message: "That deck package is older than the installed revision.", tone: "error" };
  }
  if (error instanceof DeckPackageAuthorError) {
    return {
      message: getErrorFeedback(error).message,
      tone: "error",
    };
  }
  return { message: "Could not import deck package. Try again.", tone: "error" };
}

export function isRetryableDeckDownloadError(error: unknown): boolean {
  return (
    error instanceof AppError &&
    ["DECK_DOWNLOAD_FAILED", "DECK_DOWNLOAD_TIMED_OUT", "DECK_DOWNLOAD_UNAVAILABLE"].includes(
      error.code
    )
  );
}
