import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRecurrenceTarget,
  findNextFreeRecurrencePosition,
} from "../src/features/study/config/recurrences.ts";
import { ReelFeedService } from "../src/features/reels/services/reel-feed.service.ts";

test("Again schedules within the configured eight-position jitter window", () => {
  assert.equal(
    calculateRecurrenceTarget(10, "again", () => 0),
    16
  );
  assert.equal(
    calculateRecurrenceTarget(10, "again", () => 0.999999),
    20
  );
});

test("Hard schedules within the configured sixteen-position jitter window", () => {
  assert.equal(
    calculateRecurrenceTarget(10, "hard", () => 0),
    22
  );
  assert.equal(
    calculateRecurrenceTarget(10, "hard", () => 0.999999),
    30
  );
});

test("collision moves a recurrence to the next free position", () => {
  assert.equal(findNextFreeRecurrencePosition(20, 10, new Set([20, 21])), 22);
});

test("Good and Easy do not produce same-session recurrence targets", () => {
  assert.equal(
    calculateRecurrenceTarget(10, "good", () => 0.5),
    null
  );
  assert.equal(
    calculateRecurrenceTarget(10, "easy", () => 0.5),
    null
  );
});

test("resuming a session overlays its persisted recurrence occurrence", async () => {
  const cards = [
    { id: "card-a", deckId: "deck-a" },
    { id: "card-b", deckId: "deck-a" },
  ];
  const service = new ReelFeedService({
    listSessionRecurrences: async () => [
      {
        consumedAt: null,
        createdAt: "2026-09-05T00:00:00.000Z",
        flashcardId: "card-a",
        id: "recurrence-a",
        sourceAttemptId: "attempt-a",
        studySessionId: "session-a",
        targetPosition: 1,
      },
    ],
    listSessionItems: async () => [
      { flashcardId: "card-a", position: 0 },
      { flashcardId: "card-b", position: 1 },
    ],
    openSession: async () => ({
      created: false,
      session: {
        currentPosition: 1,
        id: "session-a",
      },
    }),
  });

  const feed = await service.prepareFeed(cards, "mixed", null, false);

  assert.deepEqual(
    feed.cards.map((card) => card.id),
    ["card-a", "card-a", "card-b"]
  );
  assert.equal(feed.recurrenceIds.get(1), "recurrence-a");
  assert.equal(feed.currentPosition, 1);
});
