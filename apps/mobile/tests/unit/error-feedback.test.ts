import { DeckPackageParseError, DeckParseError } from "@flashcard-reels/deck-contract";
import { describe, expect, it } from "vitest";

import { AppError } from "@/shared/errors/app-error";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";

describe("error feedback", () => {
  it("handles manifest parse errors explicitly", () => {
    expect(getErrorFeedback(new DeckParseError([{ path: ["id"], message: "Invalid" }]))).toEqual({
      message: "That deck package is invalid or damaged.",
    });
  });
  it.each([
    [
      "DECK_PACKAGE_AUTHOR_CONFLICT",
      "That deck belongs to a different author than the installed deck.",
    ],
    ["PROGRESS_BACKUP_INVALID", "That progress backup is invalid or damaged. Choose another file."],
    ["PROGRESS_BACKUP_TOO_LARGE", "That progress backup is too large to import."],
    ["PROGRESS_BACKUP_VERSION_UNSUPPORTED", "This app cannot read that progress backup version."],
    ["PROGRESS_BACKUP_READ_FAILED", "Could not prepare the backup preview. Try again."],
    [
      "PROGRESS_BACKUP_EXPORT_FAILED",
      "Could not export progress. Your learning data is still on this device.",
    ],
    [
      "PROGRESS_BACKUP_RESTORE_FAILED",
      "Could not replace progress. Current progress is still on this device.",
    ],
    ["DATABASE_ROW_INVALID", "Some saved data could not be read. Restart the app and try again."],
    ["STUDY_SESSION_ENDED", "This study session has ended. Reload the feed to continue."],
    ["DECK_PACKAGE_ID_CONFLICT", "Could not import deck package. Try again."],
    ["SAVED_PROGRESS_UNAVAILABLE", "Could not update saved progress. Try again."],
    ["PROGRESS_BACKUP_UNAVAILABLE", "Could not share the previous progress backup."],
    ["FILE_SHARING_UNAVAILABLE", "Could not share the previous progress backup."],
  ] as const)("maps %s", (code, message) => {
    expect(
      getErrorFeedback(new AppError({ name: "TestError", code, message: "Technical details" }))
    ).toEqual({ message });
  });
  it("offers another file when the shared parser rejects a package", () => {
    expect(
      getErrorFeedback(new DeckPackageParseError([{ path: ["deck.json"], message: "Invalid" }]))
    ).toEqual({
      message: "That deck package is invalid or damaged.",
    });
  });
  it("maps only the outer AppError code", () => {
    const error = new AppError({
      name: "OperationError",
      code: "FEED_EXTENSION_FAILED",
      message: "More cards failed",
      cause: new AppError({
        name: "NestedError",
        code: "DATABASE_MIGRATION_FAILED",
        message: "Nested database error",
      }),
    });

    expect(getErrorFeedback(error)).toEqual({
      message: "More cards could not be loaded.",
    });
  });

  it("uses neutral feedback for unknown values", () => {
    expect(getErrorFeedback("database is corrupt")).toEqual({
      message: "Something went wrong while loading this part of the app.",
    });
  });

  it.each([
    ["PREFERENCES_READ_FAILED", "Some settings could not be loaded. Using defaults."],
    [
      "PREFERENCES_WRITE_FAILED",
      "Some settings could not be saved reliably. Changes may be lost when you close the app.",
    ],
  ] as const)("keeps %s feedback aligned with its operation", (code, message) => {
    expect(
      getErrorFeedback(
        new AppError({ code, message: "technical details", name: "PreferencesError" })
      )
    ).toEqual({ message });
  });
});
