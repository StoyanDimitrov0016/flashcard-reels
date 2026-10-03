export type StudySessionRecurrenceFields = Readonly<{
  consumedAt: string | null;
  createdAt: string;
  flashcardId: string;
  id: string;
  flashcardReviewAttemptId: string;
  studySessionId: string;
  targetReelPosition: number;
}>;

export class StudySessionRecurrence {
  public readonly id: string;
  public readonly studySessionId: string;
  public readonly flashcardId: string;
  public readonly flashcardReviewAttemptId: string;
  public readonly targetReelPosition: number;
  public readonly createdAt: string;
  public readonly consumedAt: string | null;

  constructor(fields: StudySessionRecurrenceFields) {
    this.consumedAt = fields.consumedAt;
    this.createdAt = fields.createdAt;
    this.flashcardId = fields.flashcardId;
    this.id = fields.id;
    this.flashcardReviewAttemptId = fields.flashcardReviewAttemptId;
    this.studySessionId = fields.studySessionId;
    this.targetReelPosition = fields.targetReelPosition;
  }
}
