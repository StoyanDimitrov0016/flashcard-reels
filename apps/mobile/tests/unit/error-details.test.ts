import { describe, expect, it } from "vitest";

import { AppError } from "@/shared/errors/app-error";
import { describeError } from "@/shared/errors/describe-error";

describe("error diagnostics", () => {
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
