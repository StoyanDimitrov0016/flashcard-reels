import { describe, expect, it } from "vitest";

import { getLocalReelIndex } from "@/features/reels/presentation/hooks/use-reel-feed";
import {
  completeReelActivation,
  createSingleFlightRequest,
  persistPositionThenExtend,
} from "@/features/reels/application/reel-position-extension";
import { FOCUS_SESSION_INACTIVITY_TIMEOUT_MS } from "@/features/study/domain/review-attempts";
import {
  OTHER_DECK_ID,
  createStudyHarness,
  createTestReelFeedService,
  makeFlashcard,
} from "../support/study-test-support";

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
    const feedService = createTestReelFeedService(harness, () => 0);
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
        const persistedSession = await harness.service.findSession(feed.studySessionId);
        observedPositions.push(persistedSession?.currentReelPosition ?? -1);
        return persisted !== null;
      },
      async () => {
        const extendedSession = await harness.service.findSession(feed.studySessionId);
        observedPositions.push(extendedSession?.currentReelPosition ?? -1);
        await feedService.extendFeed(cards, feed.studySessionId);
      }
    );

    expect(observedPositions).toEqual([activeReelPosition, activeReelPosition]);
    const extended = await feedService.refreshFeed(cards, feed.studySessionId);
    expect(extended.currentReelPosition).toBe(activeReelPosition);
    expect(extended.loadedFromReelPosition).toBe(0);
    expect(extended.loadedThroughReelPosition).toBe(10);
  });

  it("keeps furthest progress monotonic when the viewport moves backwards", async () => {
    const harness = createStudyHarness();
    const opened = await harness.service.openSession("mixed", null, false);

    await expect(harness.service.updateSessionReelPosition(opened.session.id, 5)).resolves.toEqual({
      currentReelPosition: 5,
      furthestReelPosition: 5,
    });
    await expect(harness.service.updateSessionReelPosition(opened.session.id, 2)).resolves.toEqual({
      currentReelPosition: 2,
      furthestReelPosition: 5,
    });

    await expect(harness.service.findSession(opened.session.id)).resolves.toMatchObject({
      currentReelPosition: 2,
      furthestReelPosition: 5,
    });
  });

  it("does not reopen a finalized review after backwards navigation", async () => {
    const harness = createStudyHarness();
    const opened = await harness.service.openSession("mixed", null, false);
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, opened.session.id);
    await harness.service.rateAttempt(attemptId, "good");

    await harness.service.updateSessionReelPosition(opened.session.id, 5);
    await harness.service.finalizeAttemptsOutsideEditableWindow(opened.session.id);
    await harness.service.updateSessionReelPosition(opened.session.id, 2);
    await harness.service.finalizeAttemptsOutsideEditableWindow(opened.session.id);

    const attempt = await harness.attempts.findById(attemptId);
    expect(typeof attempt?.finalizedAt).toBe("string");
  });

  it("completes recurrence and finalization before feed extension", async () => {
    const events: string[] = [];

    await completeReelActivation(
      async () => {
        events.push("position");
        return true;
      },
      async () => {
        events.push("recurrence");
      },
      async () => {
        events.push("visible");
      },
      async () => {
        events.push("finalization");
      },
      async () => {
        events.push("extension");
      }
    );

    expect(events).toEqual(["position", "recurrence", "visible", "finalization", "extension"]);
  });

  it("waits for pending rating persistence before finalization", async () => {
    const events: string[] = [];
    let releaseRating: (() => void) | undefined;
    let barrierStarted: (() => void) | undefined;
    const ratingPersisted = new Promise<void>((resolve) => {
      releaseRating = resolve;
    });
    const barrierWasReached = new Promise<void>((resolve) => {
      barrierStarted = resolve;
    });
    const activation = completeReelActivation(
      async () => true,
      async () => undefined,
      async () => undefined,
      async () => {
        events.push("finalization");
      },
      async () => undefined,
      async () => {
        events.push("barrier-start");
        barrierStarted?.();
        await ratingPersisted;
        events.push("barrier-end");
      }
    );

    await barrierWasReached;
    expect(events).toEqual(["barrier-start"]);
    releaseRating?.();
    await activation;
    expect(events).toEqual(["barrier-start", "barrier-end", "finalization"]);
  });

  it("shares one in-flight extension between proactive and end reached triggers", async () => {
    let releaseExtension: (() => void) | undefined;
    let extensionCalls = 0;
    const extensionBlocked = new Promise<void>((resolve) => {
      releaseExtension = resolve;
    });
    const requestFeedExtension = createSingleFlightRequest(async () => {
      extensionCalls += 1;
      await extensionBlocked;
    });

    const proactive = requestFeedExtension();
    const defensive = requestFeedExtension();
    expect(extensionCalls).toBe(0);
    await Promise.resolve();
    expect(extensionCalls).toBe(1);
    releaseExtension?.();
    await Promise.all([proactive, defensive]);
    expect(extensionCalls).toBe(1);
  });

  it("does not run activation effects after position persistence fails", async () => {
    const events: string[] = [];

    await expect(
      completeReelActivation(
        async () => false,
        async () => {
          events.push("recurrence");
        },
        async () => {
          events.push("visible");
        },
        async () => {
          events.push("finalization");
        },
        async () => {
          events.push("extension");
        }
      )
    ).resolves.toBe(false);

    expect(events).toEqual([]);
  });

  it("uses a different base card after a recurrence appearance updates recency", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = createTestReelFeedService(harness, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2)];
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const recurrentOccurrence = first(feed.occurrences);
    const recurrentCard = recurrentOccurrence.card;
    const attemptId = await harness.service.startAttempt(
      recurrentCard.id,
      recurrentOccurrence.reelPosition,
      feed.studySessionId
    );
    await harness.service.rateAttempt(attemptId, "again");
    await harness.service.updateSessionReelPosition(feed.studySessionId, 5);
    await feedService.extendFeed(cards, feed.studySessionId);

    const recurrence = first(await harness.service.listSessionRecurrences(feed.studySessionId));
    await harness.service.consumeRecurrence(recurrence.id);
    await feedService.recordVisibleCard(feed.studySessionId, recurrentCard.id);
    await harness.service.updateSessionReelPosition(
      feed.studySessionId,
      recurrence.targetReelPosition
    );
    const previousMaterializedPosition = await harness.service.findMaxSessionReelPosition(
      feed.studySessionId
    );
    const previousMaterializedThrough = previousMaterializedPosition ?? -1;
    await feedService.extendFeed(cards, feed.studySessionId);

    const materializedItems = await harness.service.listSessionItems(feed.studySessionId);
    const nextBaseCard = materializedItems.find(
      (item) => item.reelPosition > previousMaterializedThrough
    );
    expect(nextBaseCard?.flashcardId).toBe(cards.find((card) => card.id !== recurrentCard.id)?.id);
  });

  it("records an anchored card as an actual visible appearance", async () => {
    const harness = createStudyHarness();
    const feedService = createTestReelFeedService(harness, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2)];
    const anchored = cards[1];
    if (!anchored) {
      throw new Error("Expected an anchor card");
    }

    const feed = await feedService.prepareFeed(
      cards,
      "focused",
      anchored.deckId,
      true,
      anchored.id
    );
    await feedService.recordVisibleCard(feed.studySessionId, anchored.id);

    const session = await harness.service.findSession(feed.studySessionId);
    expect(JSON.parse(session?.feedState ?? "{}").recentCardIds).toContain(anchored.id);
  });

  it("keeps Mixed and Focused sessions active independently", async () => {
    const harness = createStudyHarness();
    const feedService = createTestReelFeedService(harness, () => 0);
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
    const feedService = createTestReelFeedService(harness, () => 0);
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
    const feedService = createTestReelFeedService(harness, () => {
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
    const feedService = createTestReelFeedService(harness, () => 0);
    const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];
    const initial = await feedService.prepareFeed(cards, "mixed", null, false);

    await harness.service.updateSessionReelPosition(initial.studySessionId, 100);
    const resumed = await feedService.prepareFeed(cards, "mixed", null, false);

    expect(resumed.occurrences.map(({ reelPosition }) => reelPosition)).toEqual(
      Array.from({ length: 11 }, (_, index) => index + 95)
    );
    const persistedItems = await harness.service.listSessionItems(initial.studySessionId);
    expect(persistedItems.length).toBeGreaterThan(resumed.occurrences.length);
    expect(resumed.loadedFromReelPosition).toBe(95);
    expect(resumed.loadedThroughReelPosition).toBe(105);
  });

  it("keeps a 1,000-position session bounded and resumable", async () => {
    const harness = createStudyHarness(() => 0);
    const feedService = createTestReelFeedService(harness, () => 0);
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

    const resumed = await createTestReelFeedService(harness, () => {
      throw new Error("A resumed prepared session must not reshuffle");
    }).prepareFeed(cards, "mixed", null, false);
    expect(resumed.occurrences.map(({ card }) => card.id)).toEqual(
      loaded.occurrences.map(({ card }) => card.id)
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
    const feedService = createTestReelFeedService(harness, () => 0);
    const cards = Array.from({ length: 10 }, (_, index) => makeFlashcard(index + 1));
    const feed = await feedService.prepareFeed(cards, "mixed", null, false);
    const sourceCard = first(feed.occurrences).card;

    const attemptId = await harness.service.startAttempt(sourceCard.id, 0, feed.studySessionId);
    await harness.service.rateAttempt(attemptId, "again");

    const initialItems = await harness.service.listSessionItems(feed.studySessionId);
    expect(initialItems.map((item) => item.baseFeedPosition)).toEqual(
      Array.from({ length: 6 }, (_, index) => index)
    );
    await harness.service.updateSessionReelPosition(feed.studySessionId, 5);
    await feedService.extendFeed(cards, feed.studySessionId);
    const extendedItems = await harness.service.listSessionItems(feed.studySessionId);
    expect(extendedItems.map((item) => item.baseFeedPosition)).toEqual(
      Array.from({ length: 15 }, (_, index) => index)
    );
    const occurrences = await feedService.refreshOccurrences(cards, feed.studySessionId);
    expect(
      occurrences.filter(({ card }) => card.id === sourceCard.id).length
    ).toBeGreaterThanOrEqual(2);
  });

  it("renders multiple recurrences at their exact reel positions without target drift", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = createTestReelFeedService(harness, () => 0);
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
    const feedService = createTestReelFeedService(harness, () => 0);
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

  it("keeps a one-card Shuffle feed moving through a pending recurrence", async () => {
    const harness = createStudyHarness(() => 0.5);
    const feedService = createTestReelFeedService(harness, () => 0);
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
    const feedService = createTestReelFeedService(harness, () => 0);
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
    const feedService = createTestReelFeedService(harness, () => 0);
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
    const feedService = createTestReelFeedService(harness, () => 0);
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
    const pendingRecurrences = await harness.service.listSessionRecurrences(feed.studySessionId);
    expect(pendingRecurrences[0]?.consumedAt).toBeNull();

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
