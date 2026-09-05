import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";

export interface StudySessionRecurrenceRepository {
  cancelPendingBySourceAttemptId(sourceAttemptId: string): Promise<void>;
  create(recurrence: StudySessionRecurrence): Promise<void>;
  findPendingBySourceAttemptId(sourceAttemptId: string): Promise<StudySessionRecurrence | null>;
  listBySessionId(studySessionId: string): Promise<StudySessionRecurrence[]>;
  markConsumed(recurrenceId: string, consumedAt: string): Promise<boolean>;
  schedulePending(
    recurrence: StudySessionRecurrence,
    proposedTargetPosition: number
  ): Promise<StudySessionRecurrence>;
  updateTargetPosition(recurrenceId: string, targetPosition: number): Promise<boolean>;
}
