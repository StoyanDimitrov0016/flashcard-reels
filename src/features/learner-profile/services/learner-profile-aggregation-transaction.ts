export type LearnerProfileAggregationResult = Readonly<{
  aggregatedAttemptCount: number;
  throughReelPosition: number;
}>;

export interface LearnerProfileAggregationTransaction {
  aggregate(
    studySessionId: string,
    throughReelPosition: number,
    now: string
  ): Promise<LearnerProfileAggregationResult>;
}
