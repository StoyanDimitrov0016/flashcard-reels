import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";

export interface StudySessionRecurrenceRepository {
  cancelPendingBySourceAttemptId(sourceAttemptId: string): Promise<void>;
  create(recurrence: StudySessionRecurrence): Promise<void>;
  listBySessionId(studySessionId: string): Promise<StudySessionRecurrence[]>;
  markConsumed(recurrenceId: string, consumedAt: string): Promise<boolean>;
  schedulePending(
    recurrence: StudySessionRecurrence,
    proposedTargetReelPosition: number
  ): Promise<StudySessionRecurrence>;
}
