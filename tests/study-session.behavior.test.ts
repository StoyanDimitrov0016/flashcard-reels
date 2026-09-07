import { describe, expect, it } from "vitest";

import { ReelFeedServiceImpl } from "@/features/reels/application/reel-feed.service.impl";
import { getLocalReelIndex } from "@/features/reels/presentation/hooks/use-reel-feed";
import { persistPositionThenExtend } from "@/features/reels/application/reel-position-extension";
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
  it("maps the persisted absolute position to the local loaded-window index", () => {
    expect(getLocalReelIndex(5_000, 4_950, 151)).toBe(50);
    expect(getLocalReelIndex(4_900, 4_950, 151)).toBe(0);
    expect(getLocalReelIndex(5_200, 4_950, 151)).toBe(150);
  });

  it("keeps the same absolute occurrence when a rolling window origin shifts", () => {
    expect(getLocalReelIndex(5_000, 4_950, 11)).toBe(10);
    expect(getLocalReelIndex(5_000, 4_991, 11)).toBe(9);
    expect(getLocalReelIndex(5_000, 5_000, 11)).toBe(0);
  });

  it("extends from the newly persisted absolute position", async () => {
    const harness = createStudyHarness();
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const activeReelPosition = 5;
    const observedPositions: number[] = [];

    await persistPositionThenExtend(
      async () => {
        const persisted = await harness.service.updateSessionReelPosition(
          feed.studySessionId,
          activeReelPosition
        );
        observedPositions.push(
          (await harness.service.findSession(feed.studySessionId))?.currentReelPosition ?? -1
        );
        return persisted;
      },
      async () => {
        observedPositions.push(
          (await harness.service.findSession(feed.studySessionId))?.currentReelPosition ?? -1
        );
        await feedService.extendFeed(cards, feed.studySessionId);
      }
    );

    expect(observedPositions).toEqual([activeReelPosition, activeReelPosition]);
    const extended = await feedService.refreshFeed(cards, feed.studySessionId);
    expect(extended.currentReelPosition).toBe(activeReelPosition);
    expect(extended.loadedFromReelPosition).toBe(0);
    expect(extended.loadedThroughReelPosition).toBe(10);
  });

  it("keeps Mixed and Focused sessions active independently", async () => {
    const harness = createStudyHarness();
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
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
    expect(
      resumedMixed.occurrences.slice(0, mixed.occurrences.length).map(({ card }) => card.id)
    ).toEqual(mixed.occurrences.map(({ card }) => card.id));
  });

  it("replaces only the previous Focused session when a different deck is selected", async () => {
    const harness = createStudyHarness();
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
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
    const feedService = new ReelFeedServiceImpl(harness.service, () => {
      shuffleCalls += 1;
      return 0;
    });
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];

    const firstFeed = await feedService.prepareFeed(cards, "mixed", null, false);
    const persistedItems = await harness.service.listSessionItems(firstFeed.studySessionId);
    const resumedFeed = await feedService.prepareFeed(cards, "mixed", null, false);
    const resumedItems = await harness.service.listSessionItems(firstFeed.studySessionId);

    const shuffleCallsAfterFirstFeed = shuffleCalls;
    expect(shuffleCallsAfterFirstFeed).toBeGreaterThan(0);
    expect(resumedItems).toEqual(persistedItems);
    expect(resumedFeed.occurrences.map(({ card }) => card.id)).toEqual(
      firstFeed.occurrences.map(({ card }) => card.id)
    );
    expect(shuffleCalls).toBe(shuffleCallsAfterFirstFeed);
  });

  it("returns a bounded absolute-position window for a long-running session", async () => {
    const harness = createStudyHarness();
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];
    const initial = await feedService.prepareFeed(cards, "mixed", null, false);

    await harness.service.updateSessionReelPosition(initial.studySessionId, 100);
    const resumed = await feedService.prepareFeed(cards, "mixed", null, false);

    expect(resumed.occurrences.map(({ reelPosition }) => reelPosition)).toEqual(
      Array.from({ length: 11 }, (_, index) => index + 95)
    );
    expect((await harness.service.listSessionItems(initial.studySessionId)).length).toBeGreaterThan(
      resumed.occurrences.length
    );
    expect(resumed.loadedFromReelPosition).toBe(95);
    expect(resumed.loadedThroughReelPosition).toBe(105);
  });

  it("keeps a 1,000-position session bounded and resumable", async () => {
    const harness = createStudyHarness(() => 0);
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = Array.from({ length: 5 }, (_, index) => makeFlashcard(index + 1));
    const initial = await feedService.prepareFeed(cards, "mixed", null, false);
    const initialItems = await harness.service.listSessionItems(initial.studySessionId);

    await harness.service.updateSessionReelPosition(initial.studySessionId, 1_000);
    const loaded = await feedService.prepareFeed(cards, "mixed", null, false);
    const persistedItems = await harness.service.listSessionItems(initial.studySessionId);

    expect(persistedItems).toHaveLength(1_006);
    expect(persistedItems.slice(0, initialItems.length)).toEqual(initialItems);
    expect(loaded.occurrences.map(({ reelPosition }) => reelPosition)).toEqual(
      Array.from({ length: 11 }, (_, index) => index + 995)
    );

    const resumed = await new ReelFeedServiceImpl(harness.service, () => {
      throw new Error("A resumed prepared session must not reshuffle");
    }).prepareFeed(cards, "mixed", null, false);
    expect(resumed.occurrences.map(({ card }) => card.id)).toEqual(
      loaded.occurrences.map(({ card }) => card.id)
    );
  });

  it("persists the ordered Focus strategy and wraps by deck position", async () => {
    const harness = createStudyHarness();
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0.999);
    const cards = [makeFlashcard(3), makeFlashcard(1), makeFlashcard(2)];
    const cardThree = cards[0];
    const cardOne = cards[1];
    const cardTwo = cards[2];
    if (!cardThree || !cardOne || !cardTwo) {
      throw new Error("Expected three cards");
    }

    const firstFeed = await feedService.prepareFeed(
      cards,
      "focused",
      cardThree.deckId,
      false,
      "ordered"
    );
    const resumedFeed = await feedService.prepareFeed(
      [cardTwo, cardThree, cardOne],
      "focused",
      cardThree.deckId,
      false,
      "ordered"
    );

    expect(firstFeed.occurrences.map(({ card }) => card.id)).toEqual([
      cardOne.id,
      cardTwo.id,
      cardThree.id,
      cardOne.id,
      cardTwo.id,
      cardThree.id,
    ]);
    expect(resumedFeed.studySessionId).toBe(firstFeed.studySessionId);
    expect(resumedFeed.occurrences.map(({ card }) => card.id)).toEqual(
      firstFeed.occurrences.map(({ card }) => card.id)
    );
  });

  it("changing the Focus strategy replaces only the Focus session", async () => {
    const harness = createStudyHarness();
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2)];
    const mixed = await feedService.prepareFeed(cards, "mixed", null, false);
    const shuffled = await feedService.prepareFeed(
      cards,
      "focused",
      cards[0]?.deckId ?? null,
      false,
      "shuffle"
    );
    const ordered = await feedService.prepareFeed(
      cards,
      "focused",
      cards[0]?.deckId ?? null,
      false,
      "ordered"
    );

    expect(ordered.studySessionId).not.toBe(shuffled.studySessionId);
    expect(
      harness.sessions.all().find((session) => session.id === shuffled.studySessionId)?.completedAt
    ).not.toBeNull();
    expect(
      harness.sessions.all().find((session) => session.id === mixed.studySessionId)?.completedAt
    ).toBeNull();
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

  it("exposes aggregation eligibility without crossing unfinished history", async () => {
    const harness = createStudyHarness();
    const { session } = await harness.service.openSession("mixed", null, false);
    await harness.service.updateSessionReelPosition(session.id, 130);

    const boundary = await harness.service.getAggregationEligibility(session.id);
    expect(boundary).toEqual({ safeThroughReelPosition: 30, shouldCheck: true });

    await harness.service.startAttempt(makeFlashcard(1).id, 20, session.id);
    const blockedBoundary = await harness.service.getAggregationEligibility(session.id);
    expect(blockedBoundary).toEqual({ safeThroughReelPosition: 19, shouldCheck: false });
  });

  it("preserves the stable base sequence when a recurrence is scheduled", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = Array.from({ length: 10 }, (_, index) => makeFlashcard(index + 1));
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const sourceCard = first(feed.occurrences).card;

    const attemptId = await harness.service.startAttempt(sourceCard.id, 0, feed.studySessionId);
    await harness.service.rateAttempt(attemptId, "again");

    expect(
      (await harness.service.listSessionItems(feed.studySessionId)).map(
        (item) => item.baseFeedPosition
      )
    ).toEqual(Array.from({ length: 6 }, (_, index) => index));
    await harness.service.updateSessionReelPosition(feed.studySessionId, 5);
    await feedService.extendFeed(cards, feed.studySessionId);
    expect(
      (await harness.service.listSessionItems(feed.studySessionId)).map(
        (item) => item.baseFeedPosition
      )
    ).toEqual(Array.from({ length: 15 }, (_, index) => index));
    const occurrences = await feedService.refreshOccurrences(cards, feed.studySessionId);
    expect(occurrences.filter(({ card }) => card.id === sourceCard.id)).toHaveLength(2);
  });

  it("renders multiple recurrences at their exact reel positions without target drift", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = Array.from({ length: 12 }, (_, index) => makeFlashcard(index + 1));
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const firstBaseCard = feed.occurrences[0]?.card;
    const secondBaseCard = feed.occurrences[1]?.card;
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

    await harness.service.updateSessionReelPosition(feed.studySessionId, 5);
    await feedService.extendFeed(cards, feed.studySessionId);
    const materializedItems = await harness.service.listSessionItems(feed.studySessionId);
    expect(materializedItems.map((item) => item.reelPosition)).not.toContain(8);
    expect(materializedItems.map((item) => item.reelPosition)).not.toContain(9);
    const occurrences = await feedService.refreshOccurrences(cards, feed.studySessionId);
    expect(occurrences.find(({ reelPosition }) => reelPosition === 8)?.card.id).toBe(
      firstBaseCard.id
    );
    expect(occurrences.find(({ reelPosition }) => reelPosition === 9)?.card.id).toBe(
      secondBaseCard.id
    );
    expect(occurrences.find(({ reelPosition }) => reelPosition === 8)?.recurrenceId).toBeDefined();
    expect(occurrences.find(({ reelPosition }) => reelPosition === 9)?.recurrenceId).toBeDefined();
  });

  it("keeps a flashcard with a pending future recurrence out of Shuffle materialization", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const reservedCard = feed.occurrences[0]?.card;
    if (!reservedCard) {
      throw new Error("Expected a prepared card");
    }

    const attemptId = await harness.service.startAttempt(reservedCard.id, 0, feed.studySessionId);
    await harness.service.rateAttempt(attemptId, "again");
    await feedService.extendFeed(cards, feed.studySessionId);

    const materializedItems = await harness.service.listSessionItems(feed.studySessionId);
    expect(
      materializedItems
        .filter((item) => item.reelPosition >= 6 && item.reelPosition <= 7)
        .map((item) => item.flashcardId)
    ).not.toContain(reservedCard.id);
  });

  it("does not exclude pending recurrences from Ordered materialization", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2)];
    const feed = await feedService.prepareFeed(
      cards,
      "focused",
      cards[0]?.deckId ?? null,
      false,
      "ordered"
    );
    const sourceCard = feed.occurrences[0]?.card;
    if (!sourceCard) {
      throw new Error("Expected a prepared card");
    }

    const attemptId = await harness.service.startAttempt(sourceCard.id, 0, feed.studySessionId);
    await harness.service.rateAttempt(attemptId, "again");
    await feedService.extendFeed(cards, feed.studySessionId);

    const materializedItems = await harness.service.listSessionItems(feed.studySessionId);
    expect(materializedItems.find((item) => item.reelPosition === 6)?.flashcardId).toBe(
      cards[0]?.id
    );
  });

  it("keeps a one-card Shuffle feed moving through a pending recurrence", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const card = makeFlashcard(1);
    const feed = await feedService.prepareFeed([card], "mixed", null, false);
    const attemptId = await harness.service.startAttempt(card.id, 0, feed.studySessionId);
    await harness.service.rateAttempt(attemptId, "again");
    const beforeExtension = await harness.service.listSessionItems(feed.studySessionId);
    const pendingRecurrence = first(
      await harness.service.listSessionRecurrences(feed.studySessionId)
    );

    await feedService.extendFeed([card], feed.studySessionId);
    const afterExtension = await harness.service.listSessionItems(feed.studySessionId);
    await harness.service.updateSessionReelPosition(feed.studySessionId, 5);
    const continued = await feedService.refreshFeed([card], feed.studySessionId);

    expect(continued.occurrences.map(({ reelPosition }) => reelPosition)).toEqual(
      Array.from({ length: 11 }, (_, index) => index)
    );
    expect(continued.occurrences.find(({ reelPosition }) => reelPosition === 8)?.recurrenceId).toBe(
      pendingRecurrence.id
    );
    expect(afterExtension.slice(0, beforeExtension.length)).toEqual(beforeExtension);
  });

  it("uses a deterministic fallback when every small-deck Shuffle candidate is reserved", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2)];
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const firstCard = feed.occurrences[0]?.card;
    const secondCard = feed.occurrences[1]?.card;
    if (!firstCard || !secondCard) {
      throw new Error("Expected two prepared cards");
    }

    const firstAttemptId = await harness.service.startAttempt(firstCard.id, 0, feed.studySessionId);
    const secondAttemptId = await harness.service.startAttempt(
      secondCard.id,
      1,
      feed.studySessionId
    );
    await harness.service.rateAttempt(firstAttemptId, "again");
    await harness.service.rateAttempt(secondAttemptId, "again");
    const beforeExtension = await harness.service.listSessionItems(feed.studySessionId);
    const pendingRecurrences = await harness.service.listSessionRecurrences(feed.studySessionId);
    const firstRecurrence = pendingRecurrences.find(
      (recurrence) => recurrence.sourceAttemptId === firstAttemptId
    );
    const secondRecurrence = pendingRecurrences.find(
      (recurrence) => recurrence.sourceAttemptId === secondAttemptId
    );
    if (!firstRecurrence || !secondRecurrence) {
      throw new Error("Expected two pending recurrences");
    }

    await feedService.extendFeed(cards, feed.studySessionId);
    const afterExtension = await harness.service.listSessionItems(feed.studySessionId);
    await harness.service.updateSessionReelPosition(feed.studySessionId, 5);
    const continued = await feedService.refreshFeed(cards, feed.studySessionId);

    expect(continued.occurrences.map(({ reelPosition }) => reelPosition)).toEqual(
      Array.from({ length: 11 }, (_, index) => index)
    );
    expect(afterExtension.slice(0, beforeExtension.length)).toEqual(beforeExtension);
    expect(continued.occurrences.find(({ reelPosition }) => reelPosition === 8)?.recurrenceId).toBe(
      firstRecurrence.id
    );
    expect(continued.occurrences.find(({ reelPosition }) => reelPosition === 9)?.recurrenceId).toBe(
      secondRecurrence.id
    );
  });

  it("keeps a pending recurrence reserved until its exact future position is materialized", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const sourceCard = feed.occurrences[0]?.card;
    if (!sourceCard) {
      throw new Error("Expected a source card");
    }

    const attemptId = await harness.service.startAttempt(sourceCard.id, 0, feed.studySessionId);
    await harness.service.rateAttempt(attemptId, "again");
    const beforeExtension = await harness.service.listSessionItems(feed.studySessionId);
    await harness.service.updateSessionReelPosition(feed.studySessionId, 5);
    const extended = await feedService.extendFeed(cards, feed.studySessionId);

    expect(beforeExtension.map((item) => item.reelPosition)).not.toContain(8);
    expect(extended.occurrences.find(({ reelPosition }) => reelPosition === 8)?.card.id).toBe(
      sourceCard.id
    );
    expect(
      extended.occurrences.find(({ reelPosition }) => reelPosition === 8)?.recurrenceId
    ).toBeDefined();
  });

  it("renders a recurrence beyond the initial materialized range only at its target", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = new ReelFeedServiceImpl(harness.service, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const sourceCard = feed.occurrences[0]?.card;
    if (!sourceCard) {
      throw new Error("Expected a base feed card");
    }

    const attemptId = await harness.service.startAttempt(sourceCard.id, 0, feed.studySessionId);
    await harness.service.rateAttempt(attemptId, "again");

    const occurrences = await feedService.refreshOccurrences(cards, feed.studySessionId);
    expect(occurrences).toHaveLength(6);
    expect(occurrences.filter(({ recurrenceId }) => recurrenceId !== null)).toHaveLength(0);
    expect((await harness.service.listSessionRecurrences(feed.studySessionId))[0]?.consumedAt).toBe(
      null
    );

    await harness.service.updateSessionReelPosition(feed.studySessionId, 5);
    const extended = await feedService.extendFeed(cards, feed.studySessionId);
    expect(extended.occurrences.find(({ reelPosition }) => reelPosition === 8)?.card.id).toBe(
      sourceCard.id
    );
    expect(
      extended.occurrences.find(({ reelPosition }) => reelPosition === 8)?.recurrenceId
    ).toBeDefined();
  });
});
