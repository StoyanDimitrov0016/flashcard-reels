import { AppError } from "@/shared/errors/app-error";

export type ErrorFeedback = Readonly<{
  message: string;
  recovery: "retry" | "choose-file" | "app-recovery" | "none";
}>;

export function getErrorFeedback(error: unknown): ErrorFeedback {
  if (!(error instanceof AppError)) {
    return {
      message: "Something went wrong while loading this part of the app.",
      recovery: "retry",
    };
  }

  switch (error.code) {
    case "DATABASE_UNAVAILABLE":
      return { message: "The app could not open its local storage.", recovery: "app-recovery" };
    case "DATABASE_CONFIGURATION_FAILED":
    case "DATABASE_MIGRATION_FAILED":
    case "BUNDLED_DECK_INSTALL_FAILED":
      return { message: "The app could not finish starting.", recovery: "app-recovery" };
    case "APP_RESET_APPLY_FAILED":
      return {
        message: "The app could not finish its pending recovery.",
        recovery: "app-recovery",
      };
    case "APP_RESET_REQUEST_FAILED":
      return { message: "The app could not schedule a full reset.", recovery: "app-recovery" };
    case "APP_RESET_UNSUPPORTED":
      return {
        message: "Full reset must be completed from the app's storage settings.",
        recovery: "none",
      };
    case "DECK_PACKAGE_INVALID":
      return { message: "That deck package is invalid or damaged.", recovery: "choose-file" };
    case "DECK_PACKAGE_VERSION_CONFLICT":
      return {
        message: "That deck package conflicts with the installed deck version.",
        recovery: "choose-file",
      };
    case "DECK_NOT_FOUND":
      return { message: "This deck is no longer available.", recovery: "none" };
    case "FOCUS_RESTORE_FAILED":
      return { message: "The focused study session could not be restored.", recovery: "retry" };
    case "STUDY_PERSISTENCE_FAILED":
      return { message: "Study progress could not be saved.", recovery: "retry" };
    case "FEED_EXTENSION_FAILED":
      return { message: "More cards could not be loaded.", recovery: "retry" };
    case "PREFERENCES_READ_FAILED":
    case "PREFERENCES_WRITE_FAILED":
      return { message: "Some settings could not be saved reliably.", recovery: "none" };
    case "DECK_OPERATION_FAILED":
      return { message: "That deck change could not be completed.", recovery: "retry" };
    case "PROGRESS_RESET_FAILED":
      return { message: "The learning-progress reset could not be completed.", recovery: "retry" };
    case "AUDIO_PLAYBACK_FAILED":
      return { message: "Audio is unavailable for this card.", recovery: "none" };
    case "VIEW_LOAD_FAILED":
      return { message: "This screen could not load its data.", recovery: "retry" };
    default:
      return {
        message: "Something went wrong while loading this part of the app.",
        recovery: "retry",
      };
  }
}
