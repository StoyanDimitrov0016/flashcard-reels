import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";

import {
  explainFlashcardProgress,
  toRecallPercentage,
} from "@/features/flashcard-progress/domain/flashcard-progress-explanation";

type ReviewedRow = Readonly<{
  deck: Readonly<{ id: string }>;
  explanation: Readonly<{ reviewCount: number }>;
}>;

export type ReviewSummary = Readonly<{
  cardCount: number;
  reviewedCount: number;
  reviewedByDeckId: ReadonlyMap<string, number>;
}>;

/** Counts cards and reviewed cards across the library and per deck, for the Decks screen. */
export function summarizeReviews(rows: readonly ReviewedRow[]): ReviewSummary {
  const reviewedByDeckId = new Map<string, number>();
  let reviewedCount = 0;
  for (const row of rows) {
    if (row.explanation.reviewCount > 0) {
      reviewedCount += 1;
      reviewedByDeckId.set(row.deck.id, (reviewedByDeckId.get(row.deck.id) ?? 0) + 1);
    }
  }
  return { cardCount: rows.length, reviewedCount, reviewedByDeckId };
}

/** How many of a deck's cards have at least one committed review. */
export function countReviewedCards(progress: Iterable<Readonly<{ reviewCount: number }>>): number {
  let reviewed = 0;
  for (const cardProgress of progress) {
    if (cardProgress.reviewCount > 0) {
      reviewed += 1;
    }
  }
  return reviewed;
}

export type DeckReviewMetrics = Readonly<{
  cardCount: number;
  newCount: number;
  reviewCount: number;
  /** Mean recall across reviewed cards, or null before the first review. */
  recallPercentage: number | null;
}>;

/** The headline numbers of a deck's information sheet. */
export function summarizeDeckReviews(
  cards: readonly Readonly<{ id: string }>[],
  progress: ReadonlyMap<string, FlashcardProgress>
): DeckReviewMetrics {
  let reviewedCount = 0;
  let reviewCount = 0;
  let recallScoreTotal = 0;
  for (const card of cards) {
    const cardProgress = progress.get(card.id);
    const { averageRecallScore } = explainFlashcardProgress(cardProgress ?? null);
    if (cardProgress && averageRecallScore !== null) {
      reviewedCount += 1;
      reviewCount += cardProgress.reviewCount;
      recallScoreTotal += averageRecallScore;
    }
  }
  return {
    cardCount: cards.length,
    newCount: cards.length - reviewedCount,
    reviewCount,
    recallPercentage:
      reviewedCount === 0 ? null : toRecallPercentage(recallScoreTotal / reviewedCount),
  };
}
