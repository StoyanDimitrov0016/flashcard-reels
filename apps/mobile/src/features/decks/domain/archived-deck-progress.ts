export type ArchivedDeckProgress = Readonly<{
  deckId: string;
  title: string;
  revision: number;
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
