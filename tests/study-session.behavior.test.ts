import { describe, expect, it } from "vitest";

import { ReelFeedService } from "@/features/reels/services/reel-feed.service";
import { FOCUS_SESSION_INACTIVITY_TIMEOUT_MS } from "@/features/study/config/review-attempts";
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
    const cards = Array.from({ length: 10 }, (_, index) => makeFlashcard(index + 1));

    const mixed = await feedService.prepareFeed(cards, "mixed", null, false);
    await harness.service.updateSessionReelPosition(mixed.studySessionId, 2);
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
    expect(resumedMixed.currentReelPosition).toBe(2);
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

  it("resumes a focused session before inactivity expiry and replaces it after expiry", async () => {
    const harness = createStudyHarness();
    const initial = await harness.service.openSession("focused", makeFlashcard(1).deckId, false);
    const resumed = await harness.service.openSession("focused", makeFlashcard(1).deckId, false);

    expect(resumed.created).toBe(false);
    expect(resumed.session.id).toBe(initial.session.id);

    harness.clock.advance(FOCUS_SESSION_INACTIVITY_TIMEOUT_MS);
    const restarted = await harness.service.openSession("focused", makeFlashcard(1).deckId, false);

    expect(restarted.created).toBe(true);
    expect(restarted.session.id).not.toBe(initial.session.id);
    expect(restarted.session.deckId).toBe(initial.session.deckId);
    expect(
      harness.sessions.all().find((session) => session.id === initial.session.id)?.completedAt
    ).not.toBeNull();
  });

  it("replaces only the active focused session when another deck is selected", async () => {
    const harness = createStudyHarness();
    const mixed = await harness.service.openSession("mixed", null, false);
    const focused = await harness.service.openSession("focused", makeFlashcard(1).deckId, false);
    const replacement = await harness.service.openSession("focused", OTHER_DECK_ID, false);

    expect(replacement.created).toBe(true);
    expect(
      harness.sessions.all().find((session) => session.id === focused.session.id)?.completedAt
    ).not.toBeNull();
    expect(
      harness.sessions.all().find((session) => session.id === mixed.session.id)?.completedAt
    ).toBeNull();
  });

  it("preserves the stable base sequence when a recurrence is scheduled", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedService(harness.service, () => 0);
    const cards = Array.from({ length: 10 }, (_, index) => makeFlashcard(index + 1));
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const sourceCard = first(feed.baseCards);

    const attemptId = await harness.service.startAttempt(sourceCard.id, 0, feed.studySessionId);
    await harness.service.rateAttempt(attemptId, "again");

    expect(
      (await harness.service.listSessionItems(feed.studySessionId)).map(
        (item) => item.baseFeedPosition
      )
    ).toEqual(Array.from({ length: 10 }, (_, index) => index));
    const occurrences = await feedService.refreshOccurrences(feed.baseCards, feed.studySessionId);
    expect(occurrences.cards.filter((card) => card.id === sourceCard.id)).toHaveLength(2);
  });

  it("renders multiple recurrences at their exact reel positions without target drift", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedService(harness.service, () => 0);
    const cards = Array.from({ length: 12 }, (_, index) => makeFlashcard(index + 1));
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const firstBaseCard = feed.baseCards[0];
    const secondBaseCard = feed.baseCards[1];
    if (!firstBaseCard || !secondBaseCard) {
      throw new Error("Expected two base feed cards");
    }

    const firstAttemptId = await harness.service.startAttempt(
      firstBaseCard.id,
      0,
      feed.studySessionId
    );
    const secondAttemptId = await harness.service.startAttempt(
      secondBaseCard.id,
      1,
      feed.studySessionId
    );
    await harness.service.rateAttempt(firstAttemptId, "again");
    await harness.service.rateAttempt(secondAttemptId, "again");

    const occurrences = await feedService.refreshOccurrences(feed.baseCards, feed.studySessionId);
    expect(occurrences.cards[8]?.id).toBe(firstBaseCard.id);
    expect(occurrences.cards[9]?.id).toBe(secondBaseCard.id);
    expect(occurrences.recurrenceIds.get(8)).toBeDefined();
    expect(occurrences.recurrenceIds.get(9)).toBeDefined();
  });

  it("does not render a recurrence beyond finite base-feed material before its target", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedService(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const sourceCard = feed.baseCards[0];
    if (!sourceCard) {
      throw new Error("Expected a base feed card");
    }

    const attemptId = await harness.service.startAttempt(sourceCard.id, 0, feed.studySessionId);
    await harness.service.rateAttempt(attemptId, "again");

    const occurrences = await feedService.refreshOccurrences(feed.baseCards, feed.studySessionId);
    expect(occurrences.cards).toHaveLength(cards.length);
    expect(occurrences.recurrenceIds.size).toBe(0);
    expect((await harness.service.listSessionRecurrences(feed.studySessionId))[0]?.consumedAt).toBe(
      null
    );
  });
});
