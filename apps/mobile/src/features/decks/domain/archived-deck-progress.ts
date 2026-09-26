export type ArchivedDeckProgress = Readonly<{
  deckId: string;
  title: string;
  version: number;
  lastReviewedAt: string;
  reviewCount: number;
  reviewedCardCount: number;
  estimatedBytes: number;
}>;

export type PendingDeckProgress = Readonly<{
  deckId: string;
  title: string;
  lastReviewedAt: string;
}>;
