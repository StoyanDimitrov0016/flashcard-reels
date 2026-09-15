import type { RecallLevel } from "@/features/study/domain/recall-level";

export type FlashcardReviewAttemptFields = Readonly<{
  id: string;
  flashcardId: string;
  studySessionId: string;
  reelPosition: number;
  rating: RecallLevel | null;
  createdAt: string;
  ratedAt?: string | null;
  updatedAt: string;
  finalizedAt: string | null;
}>;

export class FlashcardReviewAttempt {
  public readonly id: string;
  public readonly flashcardId: string;
  public readonly studySessionId: string;
  public readonly reelPosition: number;
  public readonly rating: RecallLevel | null;
  public readonly createdAt: string;
  public readonly ratedAt: string | null;
  public readonly updatedAt: string;
  public readonly finalizedAt: string | null;

  constructor(fields: FlashcardReviewAttemptFields) {
    this.id = fields.id;
    this.flashcardId = fields.flashcardId;
    this.studySessionId = fields.studySessionId;
    this.reelPosition = fields.reelPosition;
    this.rating = fields.rating;
    this.createdAt = fields.createdAt;
    this.ratedAt = fields.ratedAt ?? null;
    this.updatedAt = fields.updatedAt;
    this.finalizedAt = fields.finalizedAt;
  }
}
