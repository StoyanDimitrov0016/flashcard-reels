import { describe, expect, it } from "vitest";

import {
  countReviewedCards,
  summarizeReviews,
} from "@/features/flashcard-progress/presentation/review-summary";

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
});
