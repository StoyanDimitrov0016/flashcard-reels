import { describe, expect, it } from "vitest";

import {
  createFeedComposer,
  createLearningScheduler,
} from "@/features/learning-engine/application/learning-engine-factories";
import type { FeedCandidate } from "@/features/learning-engine/domain/feed-composer";
import type { LearnerMemoryState } from "@/features/learning-engine/domain/memory-state";
import { Flashcard } from "@/features/flashcards/domain/flashcard.model";

const REVIEWED_AT = "2026-01-01T00:00:00.000Z";

describe("learning-engine scheduler", () => {
  const scheduler = createLearningScheduler();

  it.each(["again", "hard", "good", "easy"] as const)(
    "applies the %s application rating to a new card",
    (rating) => {
      const result = scheduler.review("card-1", null, rating, REVIEWED_AT).memoryState;

      expect(result.flashcardId).toBe("card-1");
      expect(result.reps).toBe(1);
      expect(result.lastReviewAt).toBe(REVIEWED_AT);
      expect(result.dueAt).not.toBe(REVIEWED_AT);
      expect(result.state).toBe("review");
      expect(result.lapses).toBe(0);
    }
  );

  it("uses the persisted scheduler fields for a later review", () => {
    const first = scheduler.review("card-1", null, "good", REVIEWED_AT).memoryState;
    const second = scheduler.review(
      "card-1",
      withPersistence(first),
      "hard",
      "2026-01-04T00:00:00.000Z"
    ).memoryState;

    expect(second.reps).toBe(2);
    expect(second.lastReviewAt).toBe("2026-01-04T00:00:00.000Z");
    expect(second.stability).not.toBe(first.stability);
    expect(second.dueAt).not.toBe(first.dueAt);
  });

  it("increments lapses when a reviewed card is forgotten", () => {
    const first = scheduler.review("card-1", null, "good", REVIEWED_AT).memoryState;
    const second = scheduler.review(
      "card-1",
      withPersistence(first),
      "again",
      "2026-01-04T00:00:00.000Z"
    ).memoryState;

    expect(second.lapses).toBe(first.lapses + 1);
  });

  it("calculates retrievability on demand and it decreases over time", () => {
    const state = withPersistence(
      scheduler.review("card-1", null, "good", REVIEWED_AT).memoryState
    );

    expect(scheduler.retrievability(state, "2026-01-02T00:00:00.000Z")).toBeGreaterThan(
      scheduler.retrievability(state, "2026-01-20T00:00:00.000Z") ?? 0
    );
  });
});

describe("learning-engine feed composer", () => {
  it("favors memory pressure before new and low-pressure cards", () => {
    const composer = createFeedComposer(() => 0);
    const choice = composer.chooseNext({
      candidates: [
        candidate("low", { retrievability: 0.95 }),
        candidate("new", { isNew: true, memoryState: null, retrievability: null }),
        candidate("due", { isDue: true, retrievability: 0.7 }),
      ],
      state: { recentCardIds: [] },
    });

    expect(choice?.candidate.card.id).toBe("due");
  });

  it("uses the injected random source within a group", () => {
    const composer = createFeedComposer(() => 0.999999);
    const choice = composer.chooseNext({
      candidates: [candidate("one", { isNew: true }), candidate("two", { isNew: true })],
      state: { recentCardIds: [] },
    });

    expect(choice?.candidate.card.id).toBe("one");
  });

  it("avoids recent cards when another candidate exists and falls back for one card", () => {
    const composer = createFeedComposer(() => 0);
    const twoCardChoice = composer.chooseNext({
      candidates: [candidate("one", { isNew: true }), candidate("two", { isNew: true })],
      state: { recentCardIds: ["one"] },
    });
    const oneCardChoice = composer.chooseNext({
      candidates: [candidate("one", { isNew: true })],
      state: { recentCardIds: ["one"] },
    });

    expect(twoCardChoice?.candidate.card.id).toBe("two");
    expect(oneCardChoice?.candidate.card.id).toBe("one");
  });

  it("falls through to new cards when every pressure card is recent", () => {
    const composer = createFeedComposer(() => 0);
    const choice = composer.chooseNext({
      candidates: [
        candidate("pressure", { isDue: true, retrievability: 0.4 }),
        candidate("new-one", { isNew: true, memoryState: null, retrievability: null }),
        candidate("new-two", { isNew: true, memoryState: null, retrievability: null }),
      ],
      state: { recentCardIds: ["pressure"] },
    });

    expect(choice?.candidate.card.id).toBe("new-two");
  });

  it("rotates to another pressure card before considering new cards", () => {
    const composer = createFeedComposer(() => 0);
    const choice = composer.chooseNext({
      candidates: [
        candidate("recent-pressure", { isDue: true, retrievability: 0.4 }),
        candidate("next-pressure", { isDue: true, retrievability: 0.4 }),
        candidate("new", { isNew: true, memoryState: null, retrievability: null }),
      ],
      state: { recentCardIds: ["recent-pressure"] },
    });

    expect(choice?.candidate.card.id).toBe("next-pressure");
  });

  it("relaxes recency only after every priority group is exhausted", () => {
    const composer = createFeedComposer(() => 0);
    const choice = composer.chooseNext({
      candidates: [
        candidate("pressure", { isDue: true, retrievability: 0.4 }),
        candidate("new", { isNew: true, memoryState: null, retrievability: null }),
        candidate("low", { retrievability: 0.95 }),
      ],
      state: { recentCardIds: ["pressure", "new", "low"] },
    });

    expect(choice?.candidate.card.id).toBe("pressure");
  });

  it("does not select a reserved recurrence while another base card exists", () => {
    const composer = createFeedComposer(() => 0);
    const choice = composer.chooseNext({
      candidates: [
        candidate("reserved", { isNew: true, isReservedForImmediateRecurrence: true }),
        candidate("base", { isNew: true }),
      ],
      state: { recentCardIds: [] },
    });

    expect(choice?.candidate.card.id).toBe("base");
  });
});

function candidate(id: string, overrides: Partial<FeedCandidate> = {}): FeedCandidate {
  const card = new Flashcard({
    active: true,
    answer: `Answer ${id}`,
    createdAt: REVIEWED_AT,
    deckId: "deck-1",
    id,
    order: 0,
    question: `Question ${id}`,
    updatedAt: REVIEWED_AT,
  });
  const memoryState =
    overrides.memoryState === undefined
      ? withPersistence({
          ...createLearningScheduler().review(id, null, "good", REVIEWED_AT).memoryState,
          flashcardId: id,
        })
      : overrides.memoryState;
  return {
    card,
    dueAt: memoryState?.dueAt ?? null,
    isDue: overrides.isDue ?? false,
    isNew: overrides.isNew ?? false,
    isReservedForImmediateRecurrence: overrides.isReservedForImmediateRecurrence ?? false,
    memoryState,
    retrievability: overrides.retrievability === undefined ? 0.95 : overrides.retrievability,
  };
}

function withPersistence(
  state: Omit<LearnerMemoryState, "createdAt" | "updatedAt"> | LearnerMemoryState
): LearnerMemoryState {
  return {
    ...state,
    createdAt: REVIEWED_AT,
    updatedAt: REVIEWED_AT,
  };
}
