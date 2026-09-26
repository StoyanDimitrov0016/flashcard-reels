export type FlashcardProgressFields = Readonly<{
  againCount: number;
  createdAt: string;
  easyCount: number;
  firstReviewedAt: string | null;
  flashcardId: string;
  goodCount: number;
  hardCount: number;
  lastReviewedAt: string | null;
  resetAt: string | null;
  reviewCount: number;
  updatedAt: string;
}>;

export class FlashcardProgress {
  public readonly againCount: number;
  public readonly createdAt: string;
  public readonly easyCount: number;
  public readonly firstReviewedAt: string | null;
  public readonly flashcardId: string;
  public readonly goodCount: number;
  public readonly hardCount: number;
  public readonly lastReviewedAt: string | null;
  public readonly resetAt: string | null;
  public readonly reviewCount: number;
  public readonly updatedAt: string;

  constructor(fields: FlashcardProgressFields) {
    if (
      fields.reviewCount !==
      fields.againCount + fields.hardCount + fields.goodCount + fields.easyCount
    ) {
      throw new Error(`Card progress counter invariant failed for ${fields.flashcardId}`);
    }
    if (
      fields.firstReviewedAt !== null &&
      fields.lastReviewedAt !== null &&
      fields.firstReviewedAt > fields.lastReviewedAt
    ) {
      throw new Error(`Card progress review timestamp invariant failed for ${fields.flashcardId}`);
    }

    this.againCount = fields.againCount;
    this.createdAt = fields.createdAt;
    this.easyCount = fields.easyCount;
    this.firstReviewedAt = fields.firstReviewedAt;
    this.flashcardId = fields.flashcardId;
    this.goodCount = fields.goodCount;
    this.hardCount = fields.hardCount;
    this.lastReviewedAt = fields.lastReviewedAt;
    this.resetAt = fields.resetAt;
    this.reviewCount = fields.reviewCount;
    this.updatedAt = fields.updatedAt;
  }
}
