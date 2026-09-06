import { z } from "zod";

const LearnerProfileFieldsSchema = z.compile(
  z.object({
    againCount: z.number().int().nonnegative(),
    createdAt: z.string(),
    easyCount: z.number().int().nonnegative(),
    firstReviewedAt: z.string().nullable(),
    flashcardId: z.string(),
    goodCount: z.number().int().nonnegative(),
    hardCount: z.number().int().nonnegative(),
    lastReviewedAt: z.string().nullable(),
    resetAt: z.string().nullable(),
    reviewCount: z.number().int().nonnegative(),
    updatedAt: z.string(),
  })
);
export type LearnerProfileFields = Readonly<z.infer<typeof LearnerProfileFieldsSchema>>;

export class LearnerProfile {
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

  constructor(fields: LearnerProfileFields) {
    if (
      fields.reviewCount !==
      fields.againCount + fields.hardCount + fields.goodCount + fields.easyCount
    ) {
      throw new Error(`Learner profile counter invariant failed for ${fields.flashcardId}`);
    }
    if (
      fields.firstReviewedAt !== null &&
      fields.lastReviewedAt !== null &&
      fields.firstReviewedAt > fields.lastReviewedAt
    ) {
      throw new Error(
        `Learner profile review timestamp invariant failed for ${fields.flashcardId}`
      );
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

export function emptyLearnerProfile(
  flashcardId: string,
  createdAt: string,
  resetAt: string | null = null
): LearnerProfile {
  return new LearnerProfile({
    againCount: 0,
    createdAt,
    easyCount: 0,
    firstReviewedAt: null,
    flashcardId,
    goodCount: 0,
    hardCount: 0,
    lastReviewedAt: null,
    resetAt,
    reviewCount: 0,
    updatedAt: createdAt,
  });
}
