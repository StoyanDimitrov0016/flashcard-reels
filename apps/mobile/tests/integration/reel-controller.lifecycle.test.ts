/** @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ services: undefined as unknown, toast: vi.fn() }));
vi.mock("@/infrastructure/app-services", () => ({ useAppServices: () => harness.services }));
vi.mock("@/shared/presentation/flashcard-toast", () => ({ showErrorToast: harness.toast }));
vi.mock("@/shared/errors/report-error", () => ({ reportError: vi.fn() }));

import type { PreparedReelFeed } from "@/features/reels/domain/reel-feed";
import type { StudyFeedSnapshot } from "@/features/study/domain/study.service";

import {
  LearningProgressRevisionProvider,
  useLearningProgressRevision,
} from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useReelController } from "@/features/reels/presentation/controllers/use-reel-controller";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import {
  createScenarioGraph,
  seedDeck,
  type ScenarioGraph,
} from "../support/sqlite-study-scenario";
import {
  makeFlashcard,
  SequenceIdGenerator,
  TestClock,
  TEST_DECK_ID,
  testId,
} from "../support/study-fixtures";

describe("mounted Discover ratings", () => {
  it("keeps the newer rating when an earlier saved-rating response arrives late", async () => {
    const { graph, mounted } = await mountFeed();
    const entered = deferred<void>();
    const release = deferred<void>();
    const rate = graph.runtime.rateCard.bind(graph.runtime);
    vi.spyOn(graph.runtime, "rateCard").mockImplementationOnce(async (input) => {
      const result = await rate(input);
      entered.resolve();
      await release.promise;
      return result;
    });
    act(() => mounted.result.current.rate(0, "good"));
    await entered.promise;
    act(() => mounted.result.current.rate(0, "easy"));
    await waitFor(() => expect(mounted.result.current.cardState(0).rating).toBe("easy"));
    await act(async () => release.resolve());
    expect(mounted.result.current.cardState(0).rating).toBe("easy");
  });
  it("loads saved ratings even when a plain activation finishes before recall loading", async () => {
    const delayed = deferred<StudyFeedSnapshot>();
    let saved: StudyFeedSnapshot | null = null;
    const { graph, mounted, initialFeed } = await mountFeed(async (fixture, feed) => {
      const input = { cards: [makeFlashcard(1)], sessionId: feed.studySessionId };
      await fixture.runtime.rateCard({ ...input, reelPosition: 0, rating: "good" });
      saved = await fixture.runtime.refreshFeed(input);
      vi.spyOn(fixture.runtime, "refreshFeed").mockReturnValueOnce(delayed.promise);
    });
    act(() => mounted.result.current.activate(1));
    await waitFor(async () => {
      const session = await graph.sessions.findById(initialFeed.studySessionId);
      expect(session?.currentReelPosition).toBe(1);
    });
    const savedSnapshot = saved;
    if (!savedSnapshot) {
      throw new Error("Missing saved recall fixture");
    }
    await act(async () => delayed.resolve(savedSnapshot));
    expect(mounted.result.current.cardState(0).rating).toBe("good");
    expect(mounted.result.current.feed).toBe(initialFeed);
  });
  it("keeps the feed object when an ordinary activation only saves position", async () => {
    const { graph, mounted, initialFeed } = await mountFeed();
    act(() => mounted.result.current.activate(1));
    await waitFor(async () => {
      const session = await graph.sessions.findById(initialFeed.studySessionId);
      expect(session?.currentReelPosition).toBe(1);
    });
    expect(mounted.result.current.feed).toBe(initialFeed);
  });
  it("ignores a refresh that resolves after a newer extension", async () => {
    const { graph, mounted, occurrence, initialFeed } = await mountFeed();
    const refresh = deferred<PreparedReelFeed>();
    const refreshLoad = vi.spyOn(graph.feed, "refreshFeed").mockReturnValueOnce(refresh.promise);
    act(() => mounted.result.current.rate(occurrence.reelPosition, "hard"));
    await waitFor(() => expect(refreshLoad).toHaveBeenCalledOnce());
    await act(async () => {
      await mounted.result.current.extend();
    });
    const newerThrough = mounted.result.current.feed.materializedThroughReelPosition;
    expect(newerThrough).toBeGreaterThan(initialFeed.materializedThroughReelPosition);
    await act(async () => {
      refresh.resolve(initialFeed);
    });
    expect(mounted.result.current.feed.materializedThroughReelPosition).toBe(newerThrough);
  });
  let database: NodeSqliteDatabase;
  beforeEach(() => {
    database = new NodeSqliteDatabase();
    harness.toast.mockClear();
  });
  afterEach(() => {
    cleanup();
    database.close();
  });

  async function mountFeed(
    beforeMount?: (graph: ScenarioGraph, feed: PreparedReelFeed) => Promise<void>
  ) {
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
    await seedDeck(database, TEST_DECK_ID, [testId(1)]);
    const sourceCards = [makeFlashcard(1)];
    const initialFeed = await graph.feed.prepareFeed(sourceCards, "discover", null, false, null);
    await beforeMount?.(graph, initialFeed);
    harness.services = { studyService: graph.runtime };
    const mounted = renderHook(
      () => ({
        ...useReelController({ initialFeed, sourceCards }),
        revision: useLearningProgressRevision().revision,
      }),
      {
        wrapper: LearningProgressRevisionProvider,
      }
    );
    await waitFor(() => expect(mounted.result.current.feedback.fatal).toBeNull());
    const occurrence = initialFeed.occurrences[0];
    if (!occurrence) {
      throw new Error("Missing fixture occurrence");
    }
    return { graph, mounted, occurrence, initialFeed };
  }

  it("keeps the saved rating and feed when a committed attempt is rated", async () => {
    const { graph, mounted, occurrence, initialFeed } = await mountFeed();
    act(() => mounted.result.current.rate(occurrence.reelPosition, "good"));
    await waitFor(() => expect(mounted.result.current.cardState(0).rating).toBe("good"));
    const attempt = await graph.attempts.findBySessionAndReelPosition(
      initialFeed.studySessionId,
      0
    );
    const attemptId = attempt?.id;
    if (!attemptId) {
      throw new Error("Missing fixture attempt");
    }
    await graph.study.commitAttempt(attemptId);

    act(() => mounted.result.current.rate(occurrence.reelPosition, "easy"));

    await waitFor(() =>
      expect(harness.toast).toHaveBeenCalledWith("This rating is already saved.")
    );
    expect(mounted.result.current.feedback.fatal).toBeNull();
    expect(mounted.result.current.cardState(0).rating).toBe("good");
    const saved = await graph.attempts.findById(attemptId);
    expect(saved?.rating).toBe("good");
  });

  it("reloads after a deck reset while Discover is mounted", async () => {
    const { graph, mounted, occurrence } = await mountFeed();
    await graph.flashcardProgress.resetDeckProgress(TEST_DECK_ID);

    act(() => mounted.result.current.rate(occurrence.reelPosition, "good"));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mounted.result.current.feedback.fatal).toBeNull();
    expect(mounted.result.current.revision).toBe(1);
  });

  it("keeps a missing attempt in an active session fatal", async () => {
    const { graph, mounted, occurrence } = await mountFeed();
    act(() => mounted.result.current.rate(occurrence.reelPosition, "good"));
    await waitFor(() => expect(mounted.result.current.cardState(0).rating).toBe("good"));
    await database.runAsync("DELETE FROM flashcard_review_attempts");
    act(() => mounted.result.current.rate(occurrence.reelPosition, "easy"));
    await waitFor(() =>
      expect(mounted.result.current.feedback.fatal).toMatchObject({
        code: "STUDY_PERSISTENCE_FAILED",
      })
    );
    expect(mounted.result.current.revision).toBe(0);
    expect(await graph.study.rateAttempt(testId(9999), "good")).toEqual({ status: "missing" });
  });
});
