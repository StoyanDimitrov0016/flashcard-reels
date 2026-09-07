import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";

export type AdaptivePriority = "New" | "High" | "Normal" | "Low";

export type LearnerProfileExplanation = Readonly<{
  averageRecallScore: number | null;
  priority: AdaptivePriority;
  reason: string;
  reviewCount: number;
  selectionCopies: number;
}>;

export function explainLearnerProfile(profile: LearnerProfile | null): LearnerProfileExplanation {
  if (!profile || profile.reviewCount === 0) {
    return {
      averageRecallScore: null,
      priority: "New",
      reason: "This card has no finalized reviews yet.",
      reviewCount: 0,
      selectionCopies: 2,
    };
  }

  const averageRecallScore =
    (profile.hardCount + profile.goodCount * 2 + profile.easyCount * 3) / profile.reviewCount;
  if (averageRecallScore < 1.25) {
    return {
      averageRecallScore,
      priority: "High",
      reason: "Historical reviews contain a high share of Again/Hard ratings.",
      reviewCount: profile.reviewCount,
      selectionCopies: 3,
    };
  }
  if (averageRecallScore < 2.25) {
    return {
      averageRecallScore,
      priority: "Normal",
      reason: "Historical ratings indicate a developing recall pattern.",
      reviewCount: profile.reviewCount,
      selectionCopies: 2,
    };
  }
  return {
    averageRecallScore,
    priority: "Low",
    reason: "Historical reviews contain a high share of Good/Easy ratings.",
    reviewCount: profile.reviewCount,
    selectionCopies: 1,
  };
}

export function buildAdaptiveShuffleBag(
  cards: readonly Readonly<{ id: string }>[],
  learnerProfiles: ReadonlyMap<string, LearnerProfile>,
  random: () => number
): string[] {
  const bag: string[] = [];
  for (const card of cards) {
    const copies = explainLearnerProfile(learnerProfiles.get(card.id) ?? null).selectionCopies;
    for (let copy = 0; copy < copies; copy += 1) {
      bag.push(card.id);
    }
  }
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentCardId = bag[index];
    const swapCardId = bag[swapIndex];
    if (!currentCardId || !swapCardId) {
      continue;
    }
    bag[index] = swapCardId;
    bag[swapIndex] = currentCardId;
  }
  return bag;
}
