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
  const card = makeFlashcard(1);
  await seedDeck(database, TEST_DECK_ID, [card.id]);
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
  const open = vi.spyOn(graph.runtime, "openFeed");
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
  expect(open).toHaveBeenCalledTimes(1);
});

it("reuses a replacing Focus start when its feed remounts before it is ready", async () => {
  const graph = await scenario();
  const open = vi.spyOn(graph.runtime, "openFeed");

  const first = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });
  first.unmount();
  const second = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });

  await waitFor(() => expect(second.result.current?.occurrences.length).toBeGreaterThan(0));
  expect(open).toHaveBeenCalledTimes(1);
  const active = await graph.sessions.findActiveByScope("focus");
  expect(active?.id).toBe(second.result.current?.studySessionId);
  expect(harness.errors).toEqual([]);
});

it("starts again after a failed Focus start is retried", async () => {
  const graph = await scenario();
  const open = vi
    .spyOn(graph.runtime, "openFeed")
    .mockRejectedValueOnce(new Error("storage unavailable"));
  const first = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });
  await waitFor(() => expect(harness.errors).toHaveLength(1));
  first.unmount();

  // The route boundary's retry resets query errors before rendering again.
  renderHook(() => useQueryErrorResetBoundary()).result.current.reset();
  const second = renderHook(() => usePreparedReelFeed(focusStart), { wrapper: Providers });

  await waitFor(() => expect(second.result.current?.occurrences.length).toBeGreaterThan(0));
  expect(open).toHaveBeenCalledTimes(2);
});

it("opens a replacing Focus session only once during StrictMode replay", async () => {
  const graph = await scenario();
  const open = vi.spyOn(graph.runtime, "openFeed");
  const mounted = renderHook(() => usePreparedReelFeed(focusStart), {
    wrapper: StrictProviders,
  });
  await waitFor(() => expect(mounted.result.current?.occurrences.length).toBeGreaterThan(0));
  expect(open).toHaveBeenCalledTimes(1);
  expect(harness.errors).toEqual([]);
});
