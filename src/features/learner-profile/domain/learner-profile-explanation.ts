import type { LearnerProfile } from "./learner-profile.model";

type RecallHistoryBand = "New" | "Needs practice" | "Developing" | "Strong";

export type LearnerProfileExplanation = Readonly<{
  averageRecallScore: number | null;
  historyBand: RecallHistoryBand;
  reason: string;
  reviewCount: number;
}>;

export function explainLearnerProfile(profile: LearnerProfile | null): LearnerProfileExplanation {
  if (!profile || profile.reviewCount === 0) {
    return {
      averageRecallScore: null,
      historyBand: "New",
      reason: "This card has no finalized reviews yet.",
      reviewCount: 0,
    };
  }

  const averageRecallScore =
    (profile.hardCount + profile.goodCount * 2 + profile.easyCount * 3) / profile.reviewCount;
  if (averageRecallScore < 1.25) {
    return {
      averageRecallScore,
      historyBand: "Needs practice",
      reason: "Historical reviews contain a high share of Again/Hard ratings.",
      reviewCount: profile.reviewCount,
    };
  }
  if (averageRecallScore < 2.25) {
    return {
      averageRecallScore,
      historyBand: "Developing",
      reason: "Historical ratings indicate a developing recall pattern.",
      reviewCount: profile.reviewCount,
    };
  }
  return {
    averageRecallScore,
    historyBand: "Strong",
    reason: "Historical reviews contain a high share of Good/Easy ratings.",
    reviewCount: profile.reviewCount,
  };
}
