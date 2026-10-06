import { describe, expect, it } from "vitest";

import type { FeedCandidate } from "@/features/learning-engine/domain/feed-composer";
import type { FlashcardMemoryState } from "@/features/learning-engine/domain/flashcard-memory-state";

import { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import {
  createFeedComposer,
  createLearningScheduler,
} from "@/features/learning-engine/infrastructure/learning-engine-factories";

const REVIEWED_AT = "2026-01-01T00:00:00.000Z";

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
    hasAudio: false,
    answer: `Answer ${id}`,
    createdAt: REVIEWED_AT,
    deckId: "deck-1",
    id,
    lessonId: null,
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
  state: Omit<FlashcardMemoryState, "createdAt" | "updatedAt"> | FlashcardMemoryState
): FlashcardMemoryState {
  return {
    ...state,
    createdAt: REVIEWED_AT,
    updatedAt: REVIEWED_AT,
  };
}
