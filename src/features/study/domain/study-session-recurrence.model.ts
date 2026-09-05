import { z } from "zod";

import { FlashcardIdSchema } from "@/features/flashcards/domain/flashcard.model";

export const StudySessionRecurrenceFieldsSchema = z.compile(
  z.object({
    consumedAt: z.string().nullable(),
    createdAt: z.string(),
    flashcardId: FlashcardIdSchema,
    id: z.string(),
    sourceAttemptId: z.string(),
    studySessionId: z.string(),
    targetReelPosition: z.number().int().nonnegative(),
  })
);
export type StudySessionRecurrenceFields = Readonly<
  z.infer<typeof StudySessionRecurrenceFieldsSchema>
>;

export class StudySessionRecurrence {
  public readonly id: string;
  public readonly studySessionId: string;
  public readonly flashcardId: string;
  public readonly sourceAttemptId: string;
  public readonly targetReelPosition: number;
  public readonly createdAt: string;
  public readonly consumedAt: string | null;

  constructor(fields: StudySessionRecurrenceFields) {
    this.consumedAt = fields.consumedAt;
    this.createdAt = fields.createdAt;
    this.flashcardId = fields.flashcardId;
    this.id = fields.id;
    this.sourceAttemptId = fields.sourceAttemptId;
    this.studySessionId = fields.studySessionId;
    this.targetReelPosition = fields.targetReelPosition;
  }
}
