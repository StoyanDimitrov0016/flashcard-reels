import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";

export interface StudySessionRecurrenceRepository {
  cancelPendingByAttemptId(flashcardReviewAttemptId: string): Promise<void>;
  create(recurrence: StudySessionRecurrence): Promise<void>;
  listBySessionId(studySessionId: string): Promise<StudySessionRecurrence[]>;
  listPendingCardIdsFromTarget(
    studySessionId: string,
    fromTargetReelPosition: number
  ): Promise<string[]>;
  listBySessionIdInTargetRange(
    studySessionId: string,
    fromTargetReelPosition: number,
    throughTargetReelPosition: number
  ): Promise<StudySessionRecurrence[]>;
  markConsumed(recurrenceId: string, consumedAt: string): Promise<boolean>;
}
