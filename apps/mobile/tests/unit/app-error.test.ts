import { describe, expect, it } from "vitest";

import {
  DeckPackageValidationError,
  DeckPackageVersionError,
} from "@/features/decks/deck-installer";
import { RecoveryError } from "@/infrastructure/errors/recovery-error";
import { StartupError } from "@/infrastructure/errors/startup-error";
import { AppError } from "@/shared/errors/app-error";
import { toError, toOperationError } from "@/shared/errors/normalize-error";
import { OperationError } from "@/shared/errors/operation-error";

describe("application errors", () => {
  it("stores stable identity, context, and an Error cause", () => {
    const cause = new Error("disk full");
    const error = new AppError({
      name: "ExampleError",
      code: "DATABASE_UNAVAILABLE",
      message: "The database is unavailable",
      cause,
      context: { operation: "open", retryable: false },
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("ExampleError");
    expect(error.code).toBe("DATABASE_UNAVAILABLE");
    expect(error.context).toEqual({ operation: "open", retryable: false });
    expect(error.cause).toBe(cause);
  });

  it("keeps subclass identity and literal names", () => {
    const cases = [
      [
        new OperationError({ code: "AUDIO_PLAYBACK_FAILED", message: "Playback failed" }),
        "OperationError",
      ],
      [
        new StartupError({ code: "DATABASE_MIGRATION_FAILED", message: "Migration failed" }),
        "StartupError",
      ],
      [
        new RecoveryError({ code: "APP_RESET_APPLY_FAILED", message: "Reset failed" }),
        "RecoveryError",
      ],
      [new DeckPackageValidationError("Invalid package"), "DeckPackageValidationError"],
      [new DeckPackageVersionError("Version conflict"), "DeckPackageVersionError"],
    ] as const;

    for (const [error, name] of cases) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe(name);
    }
  });

  it("preserves non-Error values as causes when normalizing", () => {
    const thrown = { nativeCode: 13 };
    const error = toError(thrown, "Could not open storage");
    const operation = toOperationError("native rejection", {
      code: "PREFERENCES_READ_FAILED",
      message: "Preferences could not be loaded",
      context: { operation: "load" },
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Could not open storage");
    expect(error.cause).toBe(thrown);
    expect(operation).toBeInstanceOf(OperationError);
    expect(operation.cause).toBe("native rejection");
    expect(operation.code).toBe("PREFERENCES_READ_FAILED");
  });

  it("preserves an existing Error and AppError", () => {
    const error = new Error("already normalized");
    const appError = new AppError({
      name: "ExistingError",
      code: "VIEW_LOAD_FAILED",
      message: "Already classified",
    });

    expect(toError(error, "unused")).toBe(error);
    expect(toOperationError(appError, { code: "VIEW_LOAD_FAILED", message: "unused" })).toBe(
      appError
    );
  });
});
