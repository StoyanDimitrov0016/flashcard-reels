import { describe, expect, it } from "vitest";

import { isFirstReviewOnLocalDay } from "@/features/learning-engine/domain/review-day";

describe("first review on a local calendar day", () => {
  it("accepts a card with no previous review", () => {
    expect(isFirstReviewOnLocalDay(null, new Date(2026, 0, 1, 12).toISOString())).toBe(true);
  });

  it("skips another rating just before local midnight", () => {
    const first = new Date(2026, 0, 1, 12).toISOString();
    const later = new Date(2026, 0, 1, 23, 59, 59).toISOString();

    expect(isFirstReviewOnLocalDay(first, later)).toBe(false);
  });

  it("accepts a rating just after local midnight", () => {
    const first = new Date(2026, 0, 1, 23, 59, 59).toISOString();
    const next = new Date(2026, 0, 2, 0, 0, 1).toISOString();

    expect(isFirstReviewOnLocalDay(first, next)).toBe(true);
  });

  it("accepts the first rating across a local year boundary", () => {
    const first = new Date(2025, 11, 31, 23, 59).toISOString();
    const later = new Date(2026, 0, 1, 0, 1).toISOString();

    expect(isFirstReviewOnLocalDay(first, later)).toBe(true);
  });
});
