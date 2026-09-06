import { z } from "zod";

import { RecallLevelSchema, type RecallLevel } from "@/features/study/domain/recall-level";

const FlashcardReviewAttemptFieldsSchema = z.compile(
  z.object({
    id: z.string(),
    flashcardId: z.string(),
    studySessionId: z.string(),
    reelPosition: z.number().int().nonnegative(),
    rating: RecallLevelSchema.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    finalizedAt: z.string().nullable(),
  })
);
export type FlashcardReviewAttemptFields = Readonly<
  z.infer<typeof FlashcardReviewAttemptFieldsSchema>
>;

export class FlashcardReviewAttempt {
  public readonly id: string;
  public readonly flashcardId: string;
  public readonly studySessionId: string;
  public readonly reelPosition: number;
  public readonly rating: RecallLevel | null;
  public readonly createdAt: string;
  public readonly updatedAt: string;
  public readonly finalizedAt: string | null;

  constructor(fields: FlashcardReviewAttemptFields) {
    this.id = fields.id;
    this.flashcardId = fields.flashcardId;
    this.studySessionId = fields.studySessionId;
    this.reelPosition = fields.reelPosition;
    this.rating = fields.rating;
    this.createdAt = fields.createdAt;
    this.updatedAt = fields.updatedAt;
    this.finalizedAt = fields.finalizedAt;
  }
}
