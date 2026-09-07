import { describe, expect, it } from "vitest";

import {
  INTRA_SESSION_RECURRENCE_CONFIG,
  calculateRecurrenceTarget,
} from "@/features/study/domain/recurrences";
import { StudyServiceImpl } from "@/features/study/application/study.service.impl";
import {
  createStudyHarness,
  InMemoryReviewAttemptTransaction,
  InMemoryStudySessionFeedTransaction,
  InMemoryStudySessionLifecycleTransaction,
  makeFlashcard,
} from "./support/study-test-support";

function first<T>(items: readonly T[]): T {
  const item = items[0];
  if (!item) {
    throw new Error("Expected at least one item");
  }
  return item;
}

function only<T>(items: readonly T[]): T {
  if (items.length !== 1) {
    throw new Error(`Expected one item, received ${items.length}`);
  }
  return first(items);
}

function requireValue<T>(value: T | null): T {
  if (value === null) {
    throw new Error("Expected a value");
  }
  return value;
}

async function openMixedSession() {
  const harness = createStudyHarness();
  const session = await harness.service.openSession("mixed", null, false);
  return { harness, session: session.session };
}

describe("intra-session recurrence behavior", () => {
  it("Again schedules after the source using the configured distance and jitter", async () => {
    const { harness, session } = await openMixedSession();
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 10, session.id);

    await harness.service.rateAttempt(attemptId, "again");

    const recurrence = only(await harness.service.listSessionRecurrences(session.id));
    const againConfig = INTRA_SESSION_RECURRENCE_CONFIG.again;
    if (!againConfig) {
      throw new Error("Missing Again recurrence configuration");
    }
    expect(recurrence.targetReelPosition).toBe(10 + againConfig.baseDistance - 2);
    expect(recurrence.targetReelPosition).toBeGreaterThan(10);
  });

  it("Hard schedules after the source using the configured distance and jitter", async () => {
    const harness = createStudyHarness(() => 0.999999);
    const session = (await harness.service.openSession("mixed", null, false)).session;
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 10, session.id);

    await harness.service.rateAttempt(attemptId, "hard");

    const recurrence = only(await harness.service.listSessionRecurrences(session.id));
    const hardConfig = INTRA_SESSION_RECURRENCE_CONFIG.hard;
    if (!hardConfig) {
      throw new Error("Missing Hard recurrence configuration");
    }
    expect(recurrence.targetReelPosition).toBe(10 + hardConfig.baseDistance + 4);
    expect(recurrence.targetReelPosition).toBeGreaterThan(10);
  });

  it.each(["good", "easy"] as const)("%s does not retain a pending recurrence", async (rating) => {
    const { harness, session } = await openMixedSession();
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);
    await harness.service.rateAttempt(attemptId, "again");
    await harness.service.rateAttempt(attemptId, rating);

    expect(
      (await harness.service.listSessionRecurrences(session.id)).filter(
        (recurrence) => recurrence.consumedAt === null
      )
    ).toHaveLength(0);
  });

  it("changing Again to Good removes the pending recurrence", async () => {
    const { harness, session } = await openMixedSession();
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);
    await harness.service.rateAttempt(attemptId, "again");
    await harness.service.rateAttempt(attemptId, "good");

    expect(await harness.service.listSessionRecurrences(session.id)).toEqual([]);
  });

  it("changing Again to Easy removes the pending recurrence", async () => {
    const { harness, session } = await openMixedSession();
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);
    await harness.service.rateAttempt(attemptId, "again");
    await harness.service.rateAttempt(attemptId, "easy");

    expect(await harness.service.listSessionRecurrences(session.id)).toEqual([]);
  });

  it("changing Again to Hard replaces the pending recurrence", async () => {
    const randomValues = [0, 0.999999];
    const harness = createStudyHarness(() => randomValues.shift() ?? 0);
    const session = (await harness.service.openSession("mixed", null, false)).session;
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);

    await harness.service.rateAttempt(attemptId, "again");
    const initialRecurrences = await harness.service.listSessionRecurrences(session.id);
    await harness.service.rateAttempt(attemptId, "hard");
    const second = await harness.service.listSessionRecurrences(session.id);

    expect(second).toHaveLength(1);
    expect(only(second).id).toBe(only(initialRecurrences).id);
    expect(only(second).targetReelPosition).toBe(20);
  });

  it("changing Hard to Again replaces the pending recurrence", async () => {
    const randomValues = [0.999999, 0];
    const harness = createStudyHarness(() => randomValues.shift() ?? 0);
    const session = (await harness.service.openSession("mixed", null, false)).session;
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);

    await harness.service.rateAttempt(attemptId, "hard");
    const initialRecurrences = await harness.service.listSessionRecurrences(session.id);
    await harness.service.rateAttempt(attemptId, "again");
    const second = await harness.service.listSessionRecurrences(session.id);

    expect(second).toHaveLength(1);
    expect(only(second).id).toBe(only(initialRecurrences).id);
    expect(only(second).targetReelPosition).toBe(6);
  });

  it("repeated identical ratings do not create duplicate pending recurrences", async () => {
    const { harness, session } = await openMixedSession();
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);

    await harness.service.rateAttempt(attemptId, "again");
    await harness.service.rateAttempt(attemptId, "again");

    expect(await harness.service.listSessionRecurrences(session.id)).toHaveLength(1);
  });

  it("moves colliding targets through every occupied position", async () => {
    const randomValues = [0.5, 0.2, 0];
    const harness = createStudyHarness(() => randomValues.shift() ?? 0);
    const session = (await harness.service.openSession("mixed", null, false)).session;
    const firstAttempt = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);
    const secondAttempt = await harness.service.startAttempt(makeFlashcard(2).id, 1, session.id);
    const thirdAttempt = await harness.service.startAttempt(makeFlashcard(3).id, 2, session.id);

    await harness.service.rateAttempt(firstAttempt, "again");
    await harness.service.rateAttempt(secondAttempt, "again");
    await harness.service.rateAttempt(thirdAttempt, "again");

    expect(
      (await harness.service.listSessionRecurrences(session.id)).map(
        (recurrence) => recurrence.targetReelPosition
      )
    ).toEqual([8, 9, 10]);
  });

  it("consumes a recurrence while retaining its history", async () => {
    const { harness, session } = await openMixedSession();
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);
    await harness.service.rateAttempt(attemptId, "again");
    const recurrence = only(await harness.service.listSessionRecurrences(session.id));

    await harness.service.consumeRecurrence(recurrence.id);

    const stored = only(await harness.service.listSessionRecurrences(session.id));
    expect(stored.consumedAt).not.toBeNull();
    expect(
      (await harness.service.listSessionRecurrences(session.id)).filter(
        (pendingRecurrence) =>
          pendingRecurrence.sourceAttemptId === attemptId && pendingRecurrence.consumedAt === null
      )
    ).toHaveLength(0);
  });

  it("creates a separate attempt for a repeated occurrence position", async () => {
    const { harness, session } = await openMixedSession();
    const card = makeFlashcard(1);
    const firstAttempt = await harness.service.startAttempt(card.id, 0, session.id);
    const repeatedAttempt = await harness.service.startAttempt(card.id, 8, session.id);

    expect(repeatedAttempt).not.toBe(firstAttempt);
    expect(harness.attempts.all()).toHaveLength(2);
  });

  it("reuses the same attempt when returning within its reel position", async () => {
    const { harness, session } = await openMixedSession();
    const card = makeFlashcard(1);
    const firstAttempt = await harness.service.startAttempt(card.id, 3, session.id);
    await harness.service.rateAttempt(firstAttempt, "again");
    const returnedAttempt = await harness.service.startAttempt(card.id, 3, session.id);

    expect(returnedAttempt).toBe(firstAttempt);
    expect(harness.attempts.all()).toHaveLength(1);
  });

  it("finalizes attempts outside the five-reel editable window only in that session", async () => {
    const { harness, session } = await openMixedSession();
    const otherSession = (
      await harness.service.openSession("focused", makeFlashcard(2).deckId, false)
    ).session;
    const mixedAttempt = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);
    const focusedAttempt = await harness.service.startAttempt(
      makeFlashcard(2).id,
      0,
      otherSession.id
    );

    await harness.service.finalizeAttemptsOutsideEditableWindow(session.id, 5);

    expect(requireValue(await harness.attempts.findById(mixedAttempt)).finalizedAt).not.toBeNull();
    expect(requireValue(await harness.attempts.findById(focusedAttempt)).finalizedAt).toBeNull();
  });

  it("does not allow a finalized attempt to be rated again", async () => {
    const { harness, session } = await openMixedSession();
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);
    await harness.service.finalizeAttempt(attemptId);

    expect(await harness.service.rateAttempt(attemptId, "good")).toBe(false);
    expect(requireValue(await harness.attempts.findById(attemptId)).rating).toBeNull();
  });

  it("leaves an unrated presentation without a recall result", async () => {
    const { harness, session } = await openMixedSession();
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);

    expect(requireValue(await harness.attempts.findById(attemptId)).rating).toBeNull();
    expect(await harness.service.listSessionRecurrences(session.id)).toEqual([]);
  });

  it("preserves pending recurrence state after service reconstruction", async () => {
    const { harness, session } = await openMixedSession();
    const attemptId = await harness.service.startAttempt(makeFlashcard(1).id, 0, session.id);
    await harness.service.rateAttempt(attemptId, "again");

    const reconstructed = new StudyServiceImpl(
      harness.attempts,
      harness.sessions,
      harness.items,
      harness.recurrences,
      harness.clock,
      { generate: () => "00000000-0000-4000-8000-000000009999" },
      new InMemoryReviewAttemptTransaction(harness.attempts, harness.recurrences),
      new InMemoryStudySessionFeedTransaction(harness.items, harness.sessions),
      new InMemoryStudySessionLifecycleTransaction(harness.sessions),
      () => 0
    );

    const recurrences = await reconstructed.listSessionRecurrences(session.id);
    expect(recurrences).toHaveLength(1);
    expect(only(recurrences).consumedAt).toBeNull();
  });
});

describe("recurrence target calculation", () => {
  it("always keeps a calculated target after its source", () => {
    expect(calculateRecurrenceTarget(0, "again", () => 0)).toBeGreaterThan(0);
    expect(calculateRecurrenceTarget(0, "hard", () => 0)).toBeGreaterThan(0);
  });
});
