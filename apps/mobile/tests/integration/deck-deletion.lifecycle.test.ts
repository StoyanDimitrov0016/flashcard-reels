import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
/** @vitest-environment jsdom */
import { Component, createElement, useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  services: undefined as unknown,
  errors: [] as Error[],
  mixed: false,
  report: vi.fn(),
}));
vi.mock("@/infrastructure/app-services", () => ({ useAppServices: () => harness.services }));
vi.mock("react-native", () => ({ AppState: { addEventListener: () => ({ remove: vi.fn() }) } }));
vi.mock("@/shared/errors/report-error", () => ({ reportError: harness.report }));

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { PreparedReelFeed } from "@/features/reels/domain/reel-feed";

import {
  LearningProgressResetProvider,
  useLearningProgressReset,
} from "@/features/card-progress/presentation/context/learning-progress-reset-context";
import { DeckServiceImpl } from "@/features/decks/application/deck.service.impl";
import { SQLiteDeckAppearanceRepository } from "@/features/decks/infrastructure/sqlite-deck-appearance.repository";
import { SQLiteDeckRemovalTransaction } from "@/features/decks/infrastructure/sqlite-deck-removal.transaction";
import { SQLiteDeckRepository } from "@/features/decks/infrastructure/sqlite-deck.repository";
import {
  DeckContentProvider,
  useDeckContentRevision,
} from "@/features/decks/presentation/context/deck-content-context";
import { useDeleteDeck } from "@/features/decks/presentation/controllers/use-delete-deck";
import { FlashcardServiceImpl } from "@/features/flashcards/application/flashcard.service.impl";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { useFlashcards } from "@/features/flashcards/presentation/controllers/use-flashcards";
import {
  FeedScopeProvider,
  useFeedScope,
} from "@/features/reels/presentation/context/feed-scope-context";
import { usePreparedReelFeed } from "@/features/reels/presentation/controllers/use-prepared-reel-feed";

import { deferred } from "../support/deferred";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import {
  createScenarioGraph,
  seedDeck,
  type ScenarioGraph,
} from "../support/sqlite-study-scenario";
import {
  makeFlashcard,
  OTHER_DECK_ID,
  TEST_DECK_ID,
  SequenceIdGenerator,
  TestClock,
} from "../support/study-fixtures";

let observedFeed: PreparedReelFeed | null = null;
let observedLoading = true;

class Boundary extends Component<Readonly<{ children: ReactNode }>, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error) {
    harness.errors.push(error);
  }
  override render() {
    return this.state.error ? createElement("span", null, "boundary failed") : this.props.children;
  }
}

function MixedFeedProbe({ cards }: Readonly<{ cards: Flashcard[] }>) {
  const feed = usePreparedReelFeed(cards, "mixed", null, false);
  useEffect(
    function observeMixedFeed() {
      observedFeed = feed;
    },
    [feed]
  );
  return null;
}
function MixedScreenProbe() {
  const { cards, loading } = useFlashcards(null);
  useEffect(
    function observeMixedLoading() {
      observedLoading = loading;
      if (loading) {
        observedFeed = null;
      }
    },
    [loading]
  );
  if (loading) {
    return null;
  }
  return createElement(MixedFeedProbe, { cards });
}
function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return createElement(
    Boundary,
    null,
    createElement(
      DeckContentProvider,
      null,
      createElement(
        LearningProgressResetProvider,
        null,
        createElement(
          FeedScopeProvider,
          null,
          children,
          harness.mixed && createElement(MixedScreenProbe)
        )
      )
    )
  );
}

describe("deck deletion across mounted feeds — real React and SQLite", () => {
  let database: NodeSqliteDatabase;
  let graph: ScenarioGraph;
  let flashcardService: FlashcardServiceImpl;

  beforeEach(async () => {
    harness.errors = [];
    harness.mixed = false;
    harness.report.mockClear();
    observedFeed = null;
    observedLoading = true;
    database = new NodeSqliteDatabase();
    await seedDeck(database, TEST_DECK_ID, [makeFlashcard(1).id, makeFlashcard(2).id]);
    await seedDeck(database, OTHER_DECK_ID, [makeFlashcard(3, OTHER_DECK_ID).id]);
    graph = createScenarioGraph(database, new TestClock(), new SequenceIdGenerator());
    flashcardService = new FlashcardServiceImpl(new SQLiteFlashcardRepository(database.drizzle));
    harness.services = {
      deckService: new DeckServiceImpl(
        new SQLiteDeckRepository(database.drizzle),
        new SQLiteDeckAppearanceRepository(database.drizzle),
        new SQLiteDeckRemovalTransaction(database.drizzle),
        null,
        graph.study
      ),
      flashcardService,
      reelFeedService: graph.feed,
      studyService: graph.study,
    };
  });
  afterEach(() => {
    cleanup();
    database?.close();
    vi.restoreAllMocks();
  });

  it("does not prepare a new mixed feed with deleted cards while the reload is pending", async () => {
    harness.mixed = true;
    const prepare = vi.spyOn(graph.feed, "prepareFeed");
    const { result } = renderHook(() => useDeleteDeck(), { wrapper: Providers });
    await waitFor(() => expect(observedFeed?.occurrences.length).toBeGreaterThan(0));
    const previousCalls = prepare.mock.calls.length;
    const reload = deferred<Flashcard[]>();
    vi.spyOn(flashcardService, "list").mockImplementationOnce(() => reload.promise);
    await act(async () => {
      expect(await result.current.deleteDeck(TEST_DECK_ID)).toBe(true);
    });
    expect(observedLoading).toBe(true);
    expect(observedFeed).toBeNull();
    expect(prepare).toHaveBeenCalledTimes(previousCalls);
    await act(async () => {
      reload.resolve(await flashcardService.list());
    });
    await waitFor(() => expect(observedFeed?.occurrences.length).toBeGreaterThan(0));
    expect(
      prepare.mock.calls
        .slice(previousCalls)
        .every(([cards]) => cards.every((card) => card.deckId === OTHER_DECK_ID))
    ).toBe(true);
    expect(harness.errors).toEqual([]);
  });

  it("clears the persisted focused deck immediately after deletion without requiring foregrounding", async () => {
    await graph.feed.prepareFeed(
      await flashcardService.listByDeckId(TEST_DECK_ID),
      "focused",
      TEST_DECK_ID,
      true
    );
    const { result } = renderHook(() => ({ ...useDeleteDeck(), ...useFeedScope() }), {
      wrapper: Providers,
    });
    await waitFor(() => {
      expect(result.current.focusRestoring).toBe(false);
      expect(result.current.focusedFeed.status).toBe("ready");
    });
    await act(async () => {
      await result.current.deleteDeck(TEST_DECK_ID);
    });
    await waitFor(() => {
      expect(result.current.focusRestoring).toBe(false);
      expect(result.current.focusedFeed.status).toBe("empty");
    });
    expect(await graph.study.resumeFocusedSession()).toBeNull();
    expect(harness.report).not.toHaveBeenCalled();
    expect(harness.errors).toEqual([]);
  });

  it("clears a deleted pending Focus selection even before its first session is confirmed", async () => {
    const { result } = renderHook(() => ({ ...useDeleteDeck(), ...useFeedScope() }), {
      wrapper: Providers,
    });
    await waitFor(() => expect(result.current.focusRestoring).toBe(false));
    act(() => result.current.startFocusedFeed(TEST_DECK_ID));
    await waitFor(() => {
      expect(result.current.focusRestoring).toBe(false);
      expect(result.current.focusedFeed.status).toBe("ready");
    });
    await act(async () => {
      await result.current.deleteDeck(TEST_DECK_ID);
    });
    await waitFor(() => expect(result.current.focusedFeed.status).toBe("empty"));
    expect(harness.errors).toEqual([]);
  });

  it("preserves a valid pending Focus selection when a different deck is deleted", async () => {
    const { result } = renderHook(() => ({ ...useDeleteDeck(), ...useFeedScope() }), {
      wrapper: Providers,
    });
    await waitFor(() => expect(result.current.focusRestoring).toBe(false));
    act(() => result.current.startFocusedFeed(OTHER_DECK_ID));
    await waitFor(() => expect(result.current.focusRestoring).toBe(false));
    await act(async () => {
      await result.current.deleteDeck(TEST_DECK_ID);
    });
    await waitFor(() => expect(result.current.focusRestoring).toBe(false));
    expect(result.current.focusedFeed).toMatchObject({ status: "ready", deckId: OTHER_DECK_ID });
  });

  it("drops a stale prepared feed synchronously when learning progress is invalidated", async () => {
    const cards = await flashcardService.list();
    const { result } = renderHook(
      () => ({
        feed: usePreparedReelFeed(cards, "mixed", null, false),
        ...useLearningProgressReset(),
      }),
      { wrapper: Providers }
    );
    await waitFor(() => expect(result.current.feed).not.toBeNull());
    const preparation = deferred<PreparedReelFeed>();
    vi.spyOn(graph.feed, "prepareFeed").mockImplementationOnce(() => preparation.promise);
    act(() => result.current.invalidateLearningProgress());
    expect(result.current.feed).toBeNull();
    await act(async () =>
      preparation.resolve(await graph.feed.prepareFeed(cards, "mixed", null, false))
    );
    await waitFor(() => expect(result.current.feed).not.toBeNull());
  });

  it("ignores an obsolete card-load result after a newer content revision", async () => {
    const slow = deferred<Flashcard[]>();
    vi.spyOn(flashcardService, "list").mockImplementationOnce(() => slow.promise);
    const { result } = renderHook(() => ({ ...useFlashcards(null), ...useDeckContentRevision() }), {
      wrapper: Providers,
    });
    act(() => result.current.invalidateDeckContent());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => slow.resolve([]));
    expect(result.current.cards).toHaveLength(3);
  });

  it("handles deleting the last deck without turning an empty feed into a failure", async () => {
    harness.mixed = true;
    const { result } = renderHook(() => ({ ...useDeleteDeck(), ...useFeedScope() }), {
      wrapper: Providers,
    });
    await waitFor(() => expect(observedFeed?.occurrences.length).toBeGreaterThan(0));
    await act(async () => {
      await result.current.deleteDeck(TEST_DECK_ID);
    });
    await waitFor(() => expect(observedFeed?.occurrences.length).toBeGreaterThan(0));
    await act(async () => {
      await result.current.deleteDeck(OTHER_DECK_ID);
    });
    await waitFor(() => expect(observedFeed?.occurrences).toEqual([]));
    expect(result.current.focusedFeed.status).toBe("empty");
    expect(harness.errors).toEqual([]);
  });

  it("does not publish failure from an old preparation that reaches SQLite after deletion", async () => {
    harness.mixed = true;
    const gate = deferred<void>();
    const originalPrepare = graph.feed.prepareFeed.bind(graph.feed);
    const failures: unknown[] = [];
    const prepare = vi.spyOn(graph.feed, "prepareFeed").mockImplementationOnce((...args) =>
      gate.promise
        .then(() => originalPrepare(...args))
        .catch((error: unknown) => {
          failures.push(error);
          throw error;
        })
    );
    const { result } = renderHook(() => useDeleteDeck(), { wrapper: Providers });
    await waitFor(() => expect(prepare).toHaveBeenCalledOnce());
    const reload = deferred<Flashcard[]>();
    vi.spyOn(flashcardService, "list").mockImplementationOnce(() => reload.promise);
    await act(async () => {
      await result.current.deleteDeck(TEST_DECK_ID);
    });
    expect(observedLoading).toBe(true);
    await act(async () => gate.resolve());
    await waitFor(() => expect(failures).toHaveLength(1));
    expect(failures[0]).toMatchObject({ code: "SQLITE_CONSTRAINT_FOREIGNKEY" });
    expect(harness.errors).toEqual([]);
    await act(async () => reload.resolve(await flashcardService.list()));
    await waitFor(() => expect(observedFeed?.occurrences.length).toBeGreaterThan(0));
    expect(harness.errors).toEqual([]);
  });

  it("deduplicates initial feed preparation under React Strict Mode", async () => {
    harness.mixed = true;
    const prepare = vi.spyOn(graph.feed, "prepareFeed");
    renderHook(() => useDeleteDeck(), { wrapper: Providers, reactStrictMode: true });
    await waitFor(() => expect(observedFeed?.occurrences.length).toBeGreaterThan(0));
    expect(prepare).toHaveBeenCalledOnce();
    expect(harness.errors).toEqual([]);
  });
});
