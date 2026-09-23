export type CardProgressAggregationResult = Readonly<{
  aggregatedAttemptCount: number;
  throughReelPosition: number;
}>;

export interface CardProgressAggregationTransaction {
  aggregate(
    studySessionId: string,
    throughReelPosition: number,
    now: string
  ): Promise<CardProgressAggregationResult>;
}
