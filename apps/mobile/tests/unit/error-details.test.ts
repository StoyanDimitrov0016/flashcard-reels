import { describe, expect, it } from "vitest";

import { describeError } from "@/shared/application/error-details";

describe("error diagnostics", () => {
  it("preserves the startup stage and the underlying native exception", () => {
    const cause = new Error("SQLite disk is full");
    const error = new Error("Startup failed while applying database migrations", { cause });
    const details = describeError(error);
    expect(details).toContain(error.message);
    expect(details).toContain(cause.message);
    expect(details).toContain("Caused by:");
  });

  it("handles cyclic causes without hanging the recovery screen", () => {
    const error = new Error("Circular cause");
    error.cause = error;
    expect(describeError(error)).toBe(error.stack);
  });

  it("includes non-Error native rejection values", () => {
    expect(describeError(new Error("Failed", { cause: "Native failure" }))).toContain(
      "Native failure"
    );
  });
});
