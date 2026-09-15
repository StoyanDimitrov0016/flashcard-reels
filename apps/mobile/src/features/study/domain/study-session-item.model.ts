import type { FlashcardId } from "@/features/flashcards/domain/flashcard.model";

export type StudySessionItemFields = Readonly<{
  flashcardId: FlashcardId;
  id: string;
  baseFeedPosition: number;
  reelPosition: number;
  studySessionId: string;
}>;

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
