export interface ReviewAttemptCommitTransaction {
  commitAttempt(attemptId: string, committedAt: string, updatedAt: string): Promise<boolean>;
}
