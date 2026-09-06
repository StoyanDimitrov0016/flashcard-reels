import { z } from "zod";

import { FlashcardIdSchema, type FlashcardId } from "@/features/flashcards/domain/flashcard.model";

const StudySessionItemFieldsSchema = z.compile(
  z.object({
    flashcardId: FlashcardIdSchema,
    id: z.string(),
    baseFeedPosition: z.number().int().nonnegative(),
    reelPosition: z.number().int().nonnegative(),
    studySessionId: z.string(),
  })
);
export type StudySessionItemFields = Readonly<z.infer<typeof StudySessionItemFieldsSchema>>;

export class StudySessionItem {
  public readonly id: string;
  public readonly studySessionId: string;
  public readonly flashcardId: FlashcardId;
  public readonly baseFeedPosition: number;
  public readonly reelPosition: number;

  constructor(fields: StudySessionItemFields) {
    this.flashcardId = fields.flashcardId;
    this.id = fields.id;
    this.baseFeedPosition = fields.baseFeedPosition;
    this.reelPosition = fields.reelPosition;
    this.studySessionId = fields.studySessionId;
  }
}
