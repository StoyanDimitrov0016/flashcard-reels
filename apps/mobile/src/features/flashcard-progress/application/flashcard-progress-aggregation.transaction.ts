export type FlashcardProgressAggregationResult = Readonly<{
  aggregatedAttemptCount: number;
  throughReelPosition: number;
}>;

export interface FlashcardProgressAggregationTransaction {
  aggregate(
    studySessionId: string,
    throughReelPosition: number,
    now: string
  ): Promise<FlashcardProgressAggregationResult>;
}
