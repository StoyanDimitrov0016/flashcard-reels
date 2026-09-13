import type { RecallLevel } from "@/features/study/domain/recall-level";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";

export interface ReviewAttemptTransaction {
  rateAttempt(
    attemptId: string,
    rating: RecallLevel,
    updatedAt: string,
    recurrence: StudySessionRecurrence | null,
    proposedTargetReelPosition: number | null
  ): Promise<boolean>;
}
