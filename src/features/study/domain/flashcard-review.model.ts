import { z } from "zod";

export const RecallLevelSchema = z.compile(z.enum(["again", "hard", "good", "easy"]));
export type RecallLevel = z.infer<typeof RecallLevelSchema>;

export const FlashcardReviewFieldsSchema = z.compile(
  z.object({
    id: z.string(),
    flashcardId: z.string(),
    level: RecallLevelSchema,
    reviewedAt: z.string(),
  })
);
export type FlashcardReviewFields = Readonly<z.infer<typeof FlashcardReviewFieldsSchema>>;

export class FlashcardReview {
  public readonly id: string;
  public readonly flashcardId: string;
  public readonly level: RecallLevel;
  public readonly reviewedAt: string;

  constructor(fields: FlashcardReviewFields) {
    this.id = fields.id;
    this.flashcardId = fields.flashcardId;
    this.level = fields.level;
    this.reviewedAt = fields.reviewedAt;
  }
}
