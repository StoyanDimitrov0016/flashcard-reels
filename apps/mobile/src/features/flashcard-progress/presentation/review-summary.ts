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
