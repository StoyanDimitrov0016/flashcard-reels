/** @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { Component, createElement, StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ services: undefined as unknown, errors: [] as Error[] }));
vi.mock("@/infrastructure/app-services", () => ({ useAppServices: () => harness.services }));

import {
  LearningProgressRevisionProvider,
  useLearningProgressRevision,
} from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { usePreparedReelFeed } from "@/features/reels/presentation/controllers/use-prepared-reel-feed";
import { createFocusStartRequests } from "@/features/reels/presentation/focus-start-requests";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { createScenarioGraph, seedDeck } from "../support/sqlite-study-scenario";
import {
  makeFlashcard,
  SequenceIdGenerator,
  TestClock,
  TEST_DECK_ID,
} from "../support/study-fixtures";

type BoundaryProps = Readonly<{ children: ReactNode }>;
class Boundary extends Component<BoundaryProps, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error) {
    harness.errors.push(error);
  }
  override render() {
    return this.state.error ? null : this.props.children;
  }
}
type ProvidersProps = Readonly<{ children: ReactNode }>;
function Providers({ children }: ProvidersProps) {
  return createElement(
    Boundary,
    null,
    createElement(LearningProgressRevisionProvider, null, children)
  );
}

let database: NodeSqliteDatabase;
beforeEach(() => {
  database = new NodeSqliteDatabase();
  harness.errors = [];
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  database.close();
});

it("surfaces a session that ends during preparation once, without reopening it", async () => {
  const card = makeFlashcard(1);
  const cards = [card];
  await seedDeck(database, TEST_DECK_ID, [card.id]);
  const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
  harness.services = { studyService: graph.runtime };
  const open = vi.spyOn(graph.runtime, "openFeed");
  const entered = deferred<string>();
  const release = deferred<void>();
  const append = graph.feedTransaction.append.bind(graph.feedTransaction);
  vi.spyOn(graph.feedTransaction, "append").mockImplementationOnce(async (sessionId, items) => {
    entered.resolve(sessionId);
    await release.promise;
    return append(sessionId, items);
  });
  const mounted = renderHook(
    () => ({
      feed: usePreparedReelFeed({
        cards,
        scope: "focus",
        deckId: TEST_DECK_ID,
        replaceExistingSession: true,
      }),
      revision: useLearningProgressRevision().revision,
    }),
    { wrapper: Providers }
  );
  const endedId = await entered.promise;
  await graph.sessions.complete(endedId, graph.clock.now());
  await act(async () => {
    release.resolve();
  });

  await waitFor(() => expect(harness.errors).toHaveLength(1));
  expect(harness.errors[0]).toMatchObject({ code: "STUDY_SESSION_ENDED" });
  expect(open).toHaveBeenCalledTimes(1);
  expect(mounted.result.current?.revision ?? 0).toBe(0);
});

it("reuses a replacing Focus start when its feed remounts before it is ready", async () => {
  const card = makeFlashcard(1);
  const cards = [card];
  await seedDeck(database, TEST_DECK_ID, [card.id]);
  const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
  harness.services = { studyService: graph.runtime };
  const open = vi.spyOn(graph.runtime, "openFeed");
  const starts = createFocusStartRequests();
  const shareRequest = (prepare: () => ReturnType<typeof starts.share>) => starts.share(1, prepare);
  const options = {
    cards,
    scope: "focus" as const,
    deckId: TEST_DECK_ID,
    replaceExistingSession: true,
    shareRequest,
  };

  const first = renderHook(() => usePreparedReelFeed(options), { wrapper: Providers });
  first.unmount();
  const second = renderHook(() => usePreparedReelFeed(options), { wrapper: Providers });

  await waitFor(() => expect(second.result.current?.occurrences.length).toBeGreaterThan(0));
  expect(open).toHaveBeenCalledTimes(1);
  const active = await graph.sessions.findActiveByScope("focus");
  expect(active?.id).toBe(second.result.current?.studySessionId);
  expect(harness.errors).toEqual([]);
});

it("starts again after a failed Focus start", async () => {
  const starts = createFocusStartRequests();
  const failed = starts.share(1, () => Promise.reject(new Error("offline")));
  await expect(failed).rejects.toThrow("offline");
  const retry = vi.fn(() => new Promise<never>(() => undefined));

  void starts.share(1, retry);

  expect(retry).toHaveBeenCalledTimes(1);
});

it("opens a replacing Focus session only once during StrictMode replay", async () => {
  const card = makeFlashcard(1);
  const cards = [card];
  await seedDeck(database, TEST_DECK_ID, [card.id]);
  const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
  harness.services = { studyService: graph.runtime };
  const open = vi.spyOn(graph.runtime, "openFeed");
  function StrictProviders({ children }: ProvidersProps) {
    return createElement(StrictMode, null, createElement(Providers, null, children));
  }
  const mounted = renderHook(
    () =>
      usePreparedReelFeed({
        cards,
        scope: "focus",
        deckId: TEST_DECK_ID,
        replaceExistingSession: true,
      }),
    {
      wrapper: StrictProviders,
    }
  );
  await waitFor(() => expect(mounted.result.current?.occurrences.length).toBeGreaterThan(0));
  expect(open).toHaveBeenCalledTimes(1);
  expect(harness.errors).toEqual([]);
});
