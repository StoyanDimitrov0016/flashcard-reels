import { describe, expect, it } from "vitest";

import {
  buildAdaptiveShuffleBag,
  explainLearnerProfile,
} from "@/features/learner-profile/domain/adaptive-shuffle-policy";
import { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";

describe("adaptive Shuffle policy", () => {
  it("gives new cards two reachable copies", () => {
    const explanation = explainLearnerProfile(null);

    expect(explanation).toMatchObject({
      priority: "New",
      selectionCopies: 2,
      reviewCount: 0,
    });
  });

  it.each([
    ["high", { againCount: 3, hardCount: 1, goodCount: 0, easyCount: 0 }, "High", 3, 4],
    ["normal", { againCount: 0, hardCount: 1, goodCount: 1, easyCount: 0 }, "Normal", 2, 2],
    ["low", { againCount: 0, hardCount: 0, goodCount: 1, easyCount: 3 }, "Low", 1, 4],
  ])(
    "derives %s priority from durable counters",
    (_name, counts, priority, copies, reviewCount) => {
      const profile = makeProfile(counts);

      expect(explainLearnerProfile(profile)).toMatchObject({
        priority,
        selectionCopies: copies,
        reviewCount,
      });
    }
  );

  it("builds a deterministic weighted bag and keeps every card reachable", () => {
    const profiles = new Map([
      ["high", makeProfile({ againCount: 3, hardCount: 1, goodCount: 0, easyCount: 0 })],
      ["normal", makeProfile({ againCount: 0, hardCount: 1, goodCount: 1, easyCount: 0 })],
      ["low", makeProfile({ againCount: 0, hardCount: 0, goodCount: 1, easyCount: 3 })],
    ]);
    const cards = [{ id: "new" }, { id: "high" }, { id: "normal" }, { id: "low" }];

    const first = buildAdaptiveShuffleBag(cards, profiles, () => 0);
    const second = buildAdaptiveShuffleBag(cards, profiles, () => 0);

    expect(first).toEqual(second);
    expect(first).toHaveLength(8);
    expect(countOf(first, "new")).toBe(2);
    expect(countOf(first, "high")).toBe(3);
    expect(countOf(first, "normal")).toBe(2);
    expect(countOf(first, "low")).toBe(1);
  });
});

function makeProfile(counts: {
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
}): LearnerProfile {
  return new LearnerProfile({
    ...counts,
    createdAt: "2026-01-01T00:00:00.000Z",
    firstReviewedAt: "2026-01-01T00:00:00.000Z",
    flashcardId: "profile-card",
    lastReviewedAt: "2026-01-02T00:00:00.000Z",
    resetAt: null,
    reviewCount: counts.againCount + counts.hardCount + counts.goodCount + counts.easyCount,
    updatedAt: "2026-01-02T00:00:00.000Z",
  });
}

function countOf(items: readonly string[], id: string): number {
  return items.filter((item) => item === id).length;
}
