export interface ReviewAttemptFinalizationTransaction {
  finalizeAttempt(attemptId: string, finalizedAt: string, updatedAt: string): Promise<boolean>;
}
