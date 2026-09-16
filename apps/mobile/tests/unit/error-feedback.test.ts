import { describe, expect, it } from "vitest";

import { AppError } from "@/shared/errors/app-error";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";

describe("error feedback", () => {
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
      recovery: "retry",
    });
  });

  it("uses neutral feedback for unknown values", () => {
    expect(getErrorFeedback("database is corrupt")).toEqual({
      message: "Something went wrong while loading this part of the app.",
      recovery: "retry",
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
    ).toEqual({ message, recovery: "none" });
  });
});
