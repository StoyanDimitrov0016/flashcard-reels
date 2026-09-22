import type { CardProgress } from "./card-progress.model";

type RecallHistoryBand = "New" | "Needs practice" | "Developing" | "Strong";

export type CardProgressExplanation = Readonly<{
  averageRecallScore: number | null;
  historyBand: RecallHistoryBand;
  reason: string;
  reviewCount: number;
}>;

export function explainCardProgress(progress: CardProgress | null): CardProgressExplanation {
  if (!progress || progress.reviewCount === 0) {
    return {
      averageRecallScore: null,
      historyBand: "New",
      reason: "This card has no finalized reviews yet.",
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
