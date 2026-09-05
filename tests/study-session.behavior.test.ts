import { describe, expect, it } from "vitest";

import { ReelFeedService } from "@/features/reels/services/reel-feed.service";
import { OTHER_DECK_ID, createStudyHarness, makeFlashcard } from "./support/study-test-support";

function first<T>(items: readonly T[]): T {
  const item = items[0];
  if (!item) {
    throw new Error("Expected at least one item");
  }
  return item;
}

describe("study session behavior", () => {
  it("keeps Mixed and Focused sessions active independently", async () => {
    const harness = createStudyHarness();
    const feedService = new ReelFeedService(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];

    const mixed = await feedService.prepareFeed(cards, "mixed", null, false);
    await harness.service.updateSessionPosition(mixed.studySessionId, 2);
    const focused = await feedService.prepareFeed(cards, "focused", first(cards).deckId, false);

    expect(harness.sessions.all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ completedAt: null, id: mixed.studySessionId, scope: "mixed" }),
        expect.objectContaining({
          completedAt: null,
          id: focused.studySessionId,
          scope: "focused",
        }),
      ])
    );

    const resumedMixed = await feedService.prepareFeed(cards, "mixed", null, false);
    expect(resumedMixed.studySessionId).toBe(mixed.studySessionId);
    expect(resumedMixed.currentPosition).toBe(2);
    expect(resumedMixed.cards.map((card) => card.id)).toEqual(mixed.cards.map((card) => card.id));
  });

  it("replaces only the previous Focused session when a different deck is selected", async () => {
    const harness = createStudyHarness();
    const feedService = new ReelFeedService(harness.service, () => 0);
    const mixedCards = [makeFlashcard(1), makeFlashcard(2)];
    const firstFocusedCards = [makeFlashcard(3)];
    const secondFocusedCards = [makeFlashcard(4, OTHER_DECK_ID)];

    const mixed = await feedService.prepareFeed(mixedCards, "mixed", null, false);
    const firstFocused = await feedService.prepareFeed(
      firstFocusedCards,
      "focused",
      first(firstFocusedCards).deckId,
      false
    );
    const secondFocused = await feedService.prepareFeed(
      secondFocusedCards,
      "focused",
      OTHER_DECK_ID,
      true
    );

    expect(secondFocused.studySessionId).not.toBe(firstFocused.studySessionId);
    expect(
      harness.sessions.all().find((session) => session.id === firstFocused.studySessionId)
        ?.completedAt
    ).not.toBeNull();
    expect(
      harness.sessions.all().find((session) => session.id === mixed.studySessionId)?.completedAt
    ).toBeNull();
  });

  it("resumes a prepared feed without reshuffling it", async () => {
    const harness = createStudyHarness();
    let shuffleCalls = 0;
    const feedService = new ReelFeedService(harness.service, () => {
      shuffleCalls += 1;
      return 0;
    });
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];

    const firstFeed = await feedService.prepareFeed(cards, "mixed", null, false);
    const persistedItems = await harness.service.listSessionItems(firstFeed.studySessionId);
    const resumedFeed = await feedService.prepareFeed(cards, "mixed", null, false);

    expect(shuffleCalls).toBe(cards.length - 1);
    expect(persistedItems.map((item) => item.flashcardId)).toEqual(
      firstFeed.baseCards.map((card) => card.id)
    );
    expect(resumedFeed.cards.map((card) => card.id)).toEqual(
      firstFeed.cards.map((card) => card.id)
    );
  });

  it("rejects a session whose scope and deck relationship is invalid", async () => {
    const harness = createStudyHarness();

    await expect(harness.service.openSession("mixed", OTHER_DECK_ID, false)).rejects.toThrow(
      "Study session scope and deck must agree"
    );
    await expect(harness.service.openSession("focused", null, false)).rejects.toThrow(
      "Study session scope and deck must agree"
    );
  });

  it("preserves the stable base sequence when a recurrence is scheduled", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedService(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const sourceCard = first(feed.baseCards);

    const attemptId = await harness.service.startAttempt(sourceCard.id, 0, feed.studySessionId);
    await harness.service.rateAttempt(attemptId, "again");

    expect(
      (await harness.service.listSessionItems(feed.studySessionId)).map((item) => item.position)
    ).toEqual([0, 1, 2]);
    const occurrences = await feedService.refreshOccurrences(feed.baseCards, feed.studySessionId);
    expect(occurrences.cards.filter((card) => card.id === sourceCard.id)).toHaveLength(2);
  });
});
