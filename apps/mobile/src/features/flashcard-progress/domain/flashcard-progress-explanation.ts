import type { FlashcardProgress } from "./flashcard-progress.model";

type RecallHistoryBand = "New" | "Needs practice" | "Developing" | "Strong";

export type FlashcardProgressExplanation = Readonly<{
  averageRecallScore: number | null;
  historyBand: RecallHistoryBand;
  reason: string;
  reviewCount: number;
}>;

/** The average recall score of a card whose every review was rated Easy. */
const MAXIMUM_RECALL_SCORE = 3;

/** An average recall score as a whole percentage of the best possible recall. */
export function toRecallPercentage(averageRecallScore: number): number {
  return Math.round((averageRecallScore / MAXIMUM_RECALL_SCORE) * 100);
}

export function explainFlashcardProgress(
  progress: FlashcardProgress | null
): FlashcardProgressExplanation {
  if (!progress || progress.reviewCount === 0) {
    return {
      averageRecallScore: null,
      historyBand: "New",
      reason: "This card has no committed reviews yet.",
      reviewCount: 0,
    };
  }

  const averageRecallScore =
    (progress.hardCount + progress.goodCount * 2 + progress.easyCount * 3) / progress.reviewCount;
  if (averageRecallScore < 1.25) {
    return {
      averageRecallScore,
      historyBand: "Needs practice",
      reason: "Historical reviews contain a high share of Again/Hard ratings.",
      reviewCount: progress.reviewCount,
    };
  }
  if (averageRecallScore < 2.25) {
    return {
      averageRecallScore,
      historyBand: "Developing",
      reason: "Historical ratings indicate a developing recall pattern.",
      reviewCount: progress.reviewCount,
    };
  }
  return {
    averageRecallScore,
    historyBand: "Strong",
    reason: "Historical reviews contain a high share of Good/Easy ratings.",
    reviewCount: progress.reviewCount,
  };
}
