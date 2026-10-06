/** @vitest-environment jsdom */
import {
  QueryClientProvider,
  useQueryErrorResetBoundary,
  type QueryClient,
} from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { Component, createElement, StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  services: undefined as unknown,
  errors: [] as Error[],
  client: undefined as QueryClient | undefined,
}));
vi.mock("@/infrastructure/app-services", () => ({ useAppServices: () => harness.services }));

import type { FeedRequest } from "@/features/reels/presentation/queries/study-queries";

import { usePreparedReelFeed } from "@/features/reels/presentation/controllers/use-prepared-reel-feed";
import { createQueryClient } from "@/shared/presentation/query/query-client";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import {
  createFlashcardService,
  createScenarioGraph,
  seedDeck,
  type ScenarioGraph,
} from "../support/sqlite-study-scenario";
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
/** One client per test, shared by every mount, like the app's single client. */
function Providers({ children }: ProvidersProps) {
  if (!harness.client) {
    throw new Error("Missing test query client");
  }
  return createElement(
    Boundary,
    null,
    createElement(QueryClientProvider, { client: harness.client }, children)
  );
}
function StrictProviders({ children }: ProvidersProps) {
  return createElement(StrictMode, null, createElement(Providers, null, children));
}

const focusStart = {
  scope: "focus" as const,
  deckId: TEST_DECK_ID,
  focusStartRevision: 1,
};

let database: NodeSqliteDatabase;
beforeEach(() => {
  database = new NodeSqliteDatabase();
  harness.errors = [];
  harness.client = createQueryClient();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  harness.client?.clear();
  database.close();
});

async function scenario(): Promise<ScenarioGraph> {
  const cards = [makeFlashcard(1), makeFlashcard(2), makeFlashcard(3)];
  await seedDeck(
    database,
    TEST_DECK_ID,
    cards.map((card) => card.id)
  );
  const graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
  harness.services = {
    deckService: {},
    flashcardService: createFlashcardService(database),
    studyService: graph.runtime,
  };
  return graph;
}

it("surfaces a session that ends during preparation once, without reopening it", async () => {
  const graph = await scenario();
  const entered = deferred<string>();
  const release = deferred<void>();
  const append = graph.feedTransaction.append.bind(graph.feedTransaction);
  vi.spyOn(graph.feedTransaction, "append").mockImplementationOnce(async (sessionId, items) => {
    entered.resolve(sessionId);
    await release.promise;
    return append(sessionId, items);
  });
  renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });
  const endedId = await entered.promise;
  await graph.sessions.complete(endedId, graph.clock.now());
  await act(async () => {
    release.resolve();
  });

  await waitFor(() => expect(harness.errors).toHaveLength(1));
  expect(harness.errors[0]).toMatchObject({ code: "STUDY_SESSION_ENDED" });
  expect(await graph.sessions.findActiveByScope("focus")).toBeNull();
  expect(await database.getFirstAsync("SELECT COUNT(*) AS count FROM study_sessions")).toEqual({
    count: 1,
  });
});

it.each([
  {
    name: "Discover",
    scope: "discover",
    deckId: null,
    anchorFlashcardId: null,
    focusStartRevision: null,
  },
  {
    name: "resumed Focus",
    scope: "focus",
    deckId: TEST_DECK_ID,
    anchorFlashcardId: null,
    focusStartRevision: null,
  },
  {
    name: "new Focus",
    scope: "focus",
    deckId: TEST_DECK_ID,
    anchorFlashcardId: null,
    focusStartRevision: 1,
  },
  {
    name: "Focus from a held card",
    scope: "focus",
    deckId: TEST_DECK_ID,
    anchorFlashcardId: makeFlashcard(2).id,
    focusStartRevision: 1,
  },
] satisfies readonly (FeedRequest & Readonly<{ name: string }>)[])(
  "resumes $name at the latest position with its rating after a remount",
  async ({ name: _name, ...request }) => {
    const graph = await scenario();
    const cards = await createFlashcardService(database).list();
    const first = renderHook(() => usePreparedReelFeed(request), { wrapper: Providers });
    await waitFor(() => expect(first.result.current?.occurrences.length).toBeGreaterThan(0));
    const initial = first.result.current;
    if (!initial) {
      throw new Error("Missing prepared feed");
    }
    expect(
      request.anchorFlashcardId === null ||
        initial.occurrences[0]?.card.id === request.anchorFlashcardId
    ).toBe(true);
    await graph.runtime.activateCard({ sessionId: initial.studySessionId, cards, reelPosition: 3 });
    await graph.runtime.activateCard({ sessionId: initial.studySessionId, cards, reelPosition: 2 });
    await graph.runtime.rateCard({
      sessionId: initial.studySessionId,
      cards,
      reelPosition: 2,
      rating: "good",
    });
    first.unmount();

    // A route error retry or a screen remount retains the app's query client. Hold the storage
    // read so the old position must not be exposed before the current snapshot is ready.
    const entered = deferred<void>();
    const release = deferred<void>();
    const refresh = graph.runtime.refreshFeed.bind(graph.runtime);
    const open = graph.runtime.openFeed.bind(graph.runtime);
    if (request.focusStartRevision !== null) {
      vi.spyOn(graph.runtime, "refreshFeed").mockImplementationOnce(async (input) => {
        entered.resolve();
        await release.promise;
        return refresh(input);
      });
    } else {
      vi.spyOn(graph.runtime, "openFeed").mockImplementationOnce(async (input) => {
        entered.resolve();
        await release.promise;
        return open(input);
      });
    }
    const second = renderHook(() => usePreparedReelFeed(request), { wrapper: Providers });
    await entered.promise;
    expect(second.result.current).toBeNull();
    await act(async () => release.resolve());
    await waitFor(() => expect(second.result.current?.currentReelPosition).toBe(2));
    expect(second.result.current?.furthestReelPosition).toBe(3);
    expect(second.result.current?.studySessionId).toBe(initial.studySessionId);
    const resumed = await graph.runtime.refreshFeed({ sessionId: initial.studySessionId, cards });
    expect(resumed.ratings.get(2)).toBe("good");
    expect(await database.getFirstAsync("SELECT COUNT(*) AS count FROM study_sessions")).toEqual({
      count: 1,
    });
    expect(harness.errors).toEqual([]);
  }
);

it("preserves an unfinished Focus start when the screen remounts", async () => {
  const graph = await scenario();
  const entered = deferred<void>();
  const release = deferred<void>();
  const append = graph.feedTransaction.append.bind(graph.feedTransaction);
  vi.spyOn(graph.feedTransaction, "append").mockImplementationOnce(async (sessionId, items) => {
    entered.resolve();
    await release.promise;
    return append(sessionId, items);
  });

  const first = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });
  await entered.promise;
  first.unmount();
  const second = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });
  await act(async () => release.resolve());

  await waitFor(() => expect(second.result.current?.occurrences.length).toBeGreaterThan(0));
  expect(await database.getFirstAsync("SELECT COUNT(*) AS count FROM study_sessions")).toEqual({
    count: 1,
  });
  const active = await graph.sessions.findActiveByScope("focus");
  expect(active?.id).toBe(second.result.current?.studySessionId);
  expect(harness.errors).toEqual([]);
});

it("retries a failed Focus snapshot without replacing the session or losing its position", async () => {
  const graph = await scenario();
  const cards = await createFlashcardService(database).list();
  const first = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });
  await waitFor(() => expect(first.result.current).not.toBeNull());
  const sessionId = first.result.current?.studySessionId;
  if (!sessionId) {
    throw new Error("Missing Focus session");
  }
  await graph.runtime.activateCard({ sessionId, cards, reelPosition: 2 });
  await graph.runtime.rateCard({ sessionId, cards, reelPosition: 2, rating: "good" });
  first.unmount();
  vi.spyOn(graph.runtime, "refreshFeed").mockRejectedValueOnce(new Error("Storage unavailable"));
  const failed = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });
  await waitFor(() => expect(harness.errors).toHaveLength(1));
  failed.unmount();
  renderHook(() => useQueryErrorResetBoundary()).result.current.reset();
  const retried = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });
  await waitFor(() => expect(retried.result.current?.currentReelPosition).toBe(2));
  expect(retried.result.current?.studySessionId).toBe(sessionId);
  const resumed = await graph.runtime.refreshFeed({ sessionId, cards });
  expect(resumed.ratings.get(2)).toBe("good");
  expect(await database.getFirstAsync("SELECT COUNT(*) AS count FROM study_sessions")).toEqual({
    count: 1,
  });
});

it("starts again after a failed Focus start is retried", async () => {
  const graph = await scenario();
  vi.spyOn(graph.runtime, "openFeed").mockRejectedValueOnce(new Error("storage unavailable"));
  const first = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });
  await waitFor(() => expect(harness.errors).toHaveLength(1));
  first.unmount();

  // The route boundary's retry resets query errors before rendering again.
  renderHook(() => useQueryErrorResetBoundary()).result.current.reset();
  const second = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });

  await waitFor(() => expect(second.result.current?.occurrences.length).toBeGreaterThan(0));
  expect(await graph.sessions.findActiveByScope("focus")).toMatchObject({
    id: second.result.current?.studySessionId,
  });
  expect(await database.getFirstAsync("SELECT COUNT(*) AS count FROM study_sessions")).toEqual({
    count: 1,
  });
});

it("opens a replacing Focus session only once during StrictMode replay", async () => {
  const graph = await scenario();
  const mounted = renderHook(() => usePreparedReelFeed(focusStart), {
    wrapper: StrictProviders,
  });
  await waitFor(() => expect(mounted.result.current?.occurrences.length).toBeGreaterThan(0));
  expect(await graph.sessions.findActiveByScope("focus")).toMatchObject({
    id: mounted.result.current?.studySessionId,
  });
  expect(await database.getFirstAsync("SELECT COUNT(*) AS count FROM study_sessions")).toEqual({
    count: 1,
  });
  expect(harness.errors).toEqual([]);
});
