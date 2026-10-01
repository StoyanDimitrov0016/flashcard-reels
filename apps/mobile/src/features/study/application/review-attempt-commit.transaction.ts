import type { RandomSource } from "@/features/study/domain/recurrences";

export interface ReviewAttemptCommitTransaction {
  commitAttempt(
    attemptId: string,
    committedAt: string,
    updatedAt: string,
    random?: RandomSource
  ): Promise<boolean>;
}
