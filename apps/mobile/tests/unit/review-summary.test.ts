import { describe, expect, it } from "vitest";

import { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import {
  countReviewedCards,
  summarizeDeckReviews,
  summarizeReviews,
} from "@/features/flashcard-progress/presentation/review-summary";

function progress(flashcardId: string, counts: { again?: number; good?: number; easy?: number }) {
  const againCount = counts.again ?? 0;
  const goodCount = counts.good ?? 0;
  const easyCount = counts.easy ?? 0;
  return new FlashcardProgress({
    againCount,
    createdAt: "2026-10-01T00:00:00.000Z",
    easyCount,
    firstReviewedAt: null,
    flashcardId,
    goodCount,
    hardCount: 0,
    lastReviewedAt: null,
    resetAt: null,
    reviewCount: againCount + goodCount + easyCount,
    updatedAt: "2026-10-01T00:00:00.000Z",
  });
}

function row(deckId: string, reviewCount: number) {
  return { deck: { id: deckId }, explanation: { reviewCount } };
}

describe("review summary", () => {
  it("counts reviewed cards in total and per deck", () => {
    const summary = summarizeReviews([row("react", 2), row("react", 0), row("sql", 1)]);

    expect(summary.cardCount).toBe(3);
    expect(summary.reviewedCount).toBe(2);
    expect(summary.reviewedByDeckId.get("react")).toBe(1);
    expect(summary.reviewedByDeckId.get("sql")).toBe(1);
  });

  it("leaves decks without reviewed cards out of the per-deck counts", () => {
    const summary = summarizeReviews([row("react", 0)]);

    expect(summary.reviewedCount).toBe(0);
    expect(summary.reviewedByDeckId.has("react")).toBe(false);
  });

  it("counts only cards with at least one review", () => {
    expect(countReviewedCards([{ reviewCount: 3 }, { reviewCount: 0 }, { reviewCount: 1 }])).toBe(
      2
    );
  });

  it("summarizes a deck's new cards, reviews, and mean recall", () => {
    const metrics = summarizeDeckReviews(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      new Map([
        ["a", progress("a", { easy: 2 })],
        ["b", progress("b", { again: 1, good: 1 })],
        ["c", progress("c", {})],
      ])
    );

    // Recall scores are 3 and 1; their mean of 2 is two thirds of the best score.
    expect(metrics).toEqual({ cardCount: 4, newCount: 2, recallPercentage: 67, reviewCount: 4 });
  });

  it("has no recall before the first review", () => {
    const metrics = summarizeDeckReviews([{ id: "a" }], new Map());

    expect(metrics).toEqual({ cardCount: 1, newCount: 1, recallPercentage: null, reviewCount: 0 });
  });
});
