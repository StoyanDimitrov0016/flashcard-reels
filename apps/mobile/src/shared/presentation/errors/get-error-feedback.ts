import { DeckPackageParseError, UnsupportedDeckSchemaError } from "@flashcard-reels/deck-contract";

import { AppError } from "@/shared/errors/app-error";

export type ErrorFeedback = Readonly<{
  message: string;
}>;

export function getErrorFeedback(error: unknown): ErrorFeedback {
  if (error instanceof UnsupportedDeckSchemaError) {
    return {
      message:
        "This deck file uses an unsupported format. Download the current version of the deck.",
    };
  }
  if (error instanceof DeckPackageParseError) {
    return { message: "That deck package is invalid or damaged." };
  }
  if (!(error instanceof AppError)) {
    return {
      message: "Something went wrong while loading this part of the app.",
    };
  }

  switch (error.code) {
    case "DATABASE_UNAVAILABLE":
      return { message: "The app could not open its local storage." };
    case "DATABASE_CONFIGURATION_FAILED":
    case "DATABASE_MIGRATION_FAILED":
    case "BUNDLED_DECK_INSTALL_FAILED":
      return { message: "The app could not finish starting." };
    case "APP_RESET_APPLY_FAILED":
      return {
        message: "The app could not finish its pending recovery.",
      };
    case "APP_RESET_REQUEST_FAILED":
      return { message: "The app could not schedule a full reset." };
    case "APP_RESET_UNSUPPORTED":
      return {
        message: "Full reset must be completed from the app's storage settings.",
      };
    case "DECK_PACKAGE_REVISION_CONFLICT":
      return {
        message: "That deck package conflicts with the installed deck revision.",
      };
    case "DECK_NOT_FOUND":
      return { message: "This deck is no longer available." };
    case "FOCUS_RESTORE_FAILED":
      return { message: "The focused study session could not be restored." };
    case "STUDY_PERSISTENCE_FAILED":
      return { message: "Study progress could not be saved." };
    case "FEED_EXTENSION_FAILED":
      return { message: "More cards could not be loaded." };
    case "PREFERENCES_READ_FAILED":
      return { message: "Some settings could not be loaded. Using defaults." };
    case "PREFERENCES_WRITE_FAILED":
      return {
        message:
          "Some settings could not be saved reliably. Changes may be lost when you close the app.",
      };
    case "DECK_OPERATION_FAILED":
      return { message: "That deck change could not be completed." };
    case "DECK_DOWNLOAD_EXPIRED":
      return {
        message: "This QR code has expired. Create a new one in the portal and scan it again.",
      };
    case "DECK_DOWNLOAD_UNAVAILABLE":
      return { message: "The deck server is unavailable. Try again in a moment." };
    case "DECK_DOWNLOAD_FAILED":
      return {
        message: "Couldn't download the deck. Check your connection and try again.",
      };
    case "DECK_DOWNLOAD_TIMED_OUT":
      return {
        message: "The download took too long. Check your connection and try again.",
      };
    case "PROGRESS_RESET_FAILED":
      return { message: "The learning-progress reset could not be completed." };
    case "AUDIO_PLAYBACK_FAILED":
      return { message: "Audio is unavailable for this card." };
    case "VIEW_LOAD_FAILED":
      return { message: "This screen could not load its data." };
    case "DECK_PACKAGE_AUTHOR_CONFLICT":
      return { message: "That deck belongs to a different author than the installed deck." };
    case "PROGRESS_BACKUP_INVALID":
      return { message: "That progress backup is invalid or damaged. Choose another file." };
    case "PROGRESS_BACKUP_TOO_LARGE":
      return { message: "That progress backup is too large to import." };
    case "PROGRESS_BACKUP_VERSION_UNSUPPORTED":
      return { message: "This app cannot read that progress backup version." };
    case "PROGRESS_BACKUP_READ_FAILED":
      return { message: "Could not prepare the backup preview. Try again." };
    case "PROGRESS_BACKUP_EXPORT_FAILED":
      return { message: "Could not export progress. Your learning data is still on this device." };
    case "PROGRESS_BACKUP_RESTORE_FAILED":
      return { message: "Could not replace progress. Current progress is still on this device." };
    case "DATABASE_ROW_INVALID":
      return { message: "Some saved data could not be read. Restart the app and try again." };
    case "STUDY_SESSION_ENDED":
      return { message: "This study session has ended. Reload the feed to continue." };
    case "DECK_PACKAGE_ID_CONFLICT":
      return {
        message:
          "This deck package reuses ids from another installed deck. Ask its author for a fixed package.",
      };
    case "SAVED_PROGRESS_UNAVAILABLE":
      return { message: "Could not update saved progress. Try again." };
    case "PROGRESS_BACKUP_UNAVAILABLE":
      return { message: "Could not share the previous progress backup." };
    case "FILE_SHARING_UNAVAILABLE":
      return { message: "Sharing isn't available on this device." };
    default: {
      const exhaustive: never = error.code;
      return exhaustive;
    }
  }
}
