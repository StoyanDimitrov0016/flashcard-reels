import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/shared/errors/app-error";
import { describeError } from "@/shared/errors/describe-error";
import { reportError } from "@/shared/errors/report-error";

describe("error diagnostics", () => {
  it("keeps the export stage and native cause visible when Expo replaces stack arguments", () => {
    const cause = new Error("Cannot write the backup file");
    cause.stack = "    at write (http://localhost:8081/index.bundle?platform=android:10:2)";
    const error = new AppError({
      name: "OperationError",
      code: "PROGRESS_BACKUP_EXPORT_FAILED",
      message: "Could not export learning progress",
      context: { operation: "progress-backup.export", stage: "share-file" },
      cause,
    });
    error.stack =
      "    at exportProgress (http://localhost:8081/index.bundle?platform=android:20:3)";
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      reportError(error, "Progress export failure");
      // Expo preserves the plain message argument but replaces stack-bearing arguments.
      const visibleMessage: unknown = logger.mock.calls[0]?.[0];
      expect(visibleMessage).toContain("Could not export learning progress");
      expect(visibleMessage).toContain("share-file");
      expect(visibleMessage).toContain("Cannot write the backup file");
      expect(visibleMessage).not.toContain("index.bundle");
    } finally {
      logger.mockRestore();
    }
  });

  it("preserves the startup stage and the underlying native exception", () => {
    const cause = new Error("SQLite disk is full");
    const error = new Error("Startup failed while applying database migrations", { cause });
    const details = describeError(error);
    expect(details).toContain(error.message);
    expect(details).toContain(cause.message);
    expect(details).toContain("Caused by:");
  });

  it("includes AppError identity, code, and context", () => {
    const error = new AppError({
      name: "StartupError",
      code: "DATABASE_MIGRATION_FAILED",
      message: "Migration failed",
      context: { phase: "migrate", attempt: 1 },
    });

    const details = describeError(error);
    expect(details).toContain("StartupError: Migration failed");
    expect(details).toContain("Code: DATABASE_MIGRATION_FAILED");
    expect(details).toContain('"phase":"migrate"');
  });

  it("handles cyclic causes without hanging the recovery screen", () => {
    const error = new Error("Circular cause");
    error.cause = error;
    expect(describeError(error)).toContain(error.stack);
  });

  it("includes non-Error native rejection values", () => {
    expect(describeError(new Error("Failed", { cause: "Native failure" }))).toContain(
      "Native failure"
    );
  });

  it("bounds deeply nested and oversized diagnostics", () => {
    let error: Error = new Error("leaf");
    for (let index = 0; index < 20; index += 1) {
      error = new Error("x".repeat(2_000), { cause: error });
    }

    const details = describeError(error);
    expect(details.length).toBeLessThanOrEqual(16 * 1024);
    expect(details).toContain("details truncated");
  });
});
