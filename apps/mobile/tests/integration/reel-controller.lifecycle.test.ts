/** @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ services: undefined as unknown, toast: vi.fn() }));
vi.mock("@/infrastructure/app-services", () => ({ useAppServices: () => harness.services }));
vi.mock("@/shared/presentation/flashcard-toast", () => ({ showErrorToast: harness.toast }));
vi.mock("@/shared/errors/report-error", () => ({ reportError: vi.fn() }));

import type { PreparedReelFeed } from "@/features/reels/domain/reel-feed";

import {
  LearningProgressRevisionProvider,
  useLearningProgressRevision,
} from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useReelController } from "@/features/reels/presentation/controllers/use-reel-controller";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import {
  makeFlashcard,
  SequenceIdGenerator,
  TestClock,
  TEST_DECK_ID,
  testId,
} from "../support/study-fixtures";

describe("mounted Discover ratings", () => {
  it("ignores a refresh that resolves after a newer extension", async () => {
    const { graph, mounted, occurrence, initialFeed } = await mountFeed();
    const refresh = deferred<PreparedReelFeed>();
    const refreshLoad = vi.spyOn(graph.feed, "refreshFeed").mockReturnValueOnce(refresh.promise);
    act(() => mounted.result.current.onRatingSelected(occurrence, "hard"));
    await waitFor(() => expect(refreshLoad).toHaveBeenCalledOnce());
    await act(async () => {
      await mounted.result.current.requestFeedExtension();
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

  async function mountFeed() {
    const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
    await seedDeck(database, TEST_DECK_ID, [testId(1)]);
    const sourceCards = [makeFlashcard(1)];
    const initialFeed = await graph.feed.prepareFeed(sourceCards, "discover", null, false, null);
    harness.services = { studyService: graph.study, reelFeedService: graph.feed };
    const mounted = renderHook(
      () => ({
        ...useReelController({ initialFeed, sourceCards }),
        revision: useLearningProgressRevision().revision,
      }),
      {
        wrapper: LearningProgressRevisionProvider,
      }
    );
    await waitFor(() => expect(mounted.result.current.loadError).toBeNull());
    const occurrence = initialFeed.occurrences[0];
    if (!occurrence) {
      throw new Error("Missing fixture occurrence");
    }
    return { graph, mounted, occurrence, initialFeed };
  }

  it("keeps the saved rating and feed when a committed attempt is rated", async () => {
    const { graph, mounted, occurrence } = await mountFeed();
    act(() => mounted.result.current.onRatingSelected(occurrence, "good"));
    await waitFor(() => expect(mounted.result.current.ratings.get(0)).toBe("good"));
    const attemptId = mounted.result.current.getAttemptId(0);
    if (!attemptId) {
      throw new Error("Missing fixture attempt");
    }
    await graph.study.commitAttempt(attemptId);

    act(() => mounted.result.current.onRatingSelected(occurrence, "easy"));

    await waitFor(() =>
      expect(harness.toast).toHaveBeenCalledWith("This rating is already saved.")
    );
    expect(mounted.result.current.fatalError).toBeNull();
    expect(mounted.result.current.ratings.get(0)).toBe("good");
    const saved = await graph.attempts.findById(attemptId);
    expect(saved?.rating).toBe("good");
  });

  it("reloads after a deck reset while Discover is mounted", async () => {
    const { graph, mounted, occurrence } = await mountFeed();
    await graph.flashcardProgress.resetDeckProgress(TEST_DECK_ID);

    act(() => mounted.result.current.onRatingSelected(occurrence, "good"));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mounted.result.current.fatalError).toBeNull();
    expect(mounted.result.current.revision).toBe(1);
  });

  it("keeps a missing attempt in an active session fatal", async () => {
    const { graph, mounted, occurrence } = await mountFeed();
    act(() => mounted.result.current.onRatingSelected(occurrence, "good"));
    await waitFor(() => expect(mounted.result.current.ratings.get(0)).toBe("good"));
    await database.runAsync("DELETE FROM flashcard_review_attempts");
    act(() => mounted.result.current.onRatingSelected(occurrence, "easy"));
    await waitFor(() =>
      expect(mounted.result.current.fatalError).toMatchObject({ code: "STUDY_PERSISTENCE_FAILED" })
    );
    expect(mounted.result.current.revision).toBe(0);
    expect(await graph.study.rateAttempt(testId(9999), "good")).toEqual({ status: "missing" });
  });
});
