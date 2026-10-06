/** @vitest-environment jsdom */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { Component, createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { Deck } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

const harness = vi.hoisted(() => ({
  boundaryError: null as Error | null,
  findDeck: vi.fn<(id: string) => Promise<Deck | null>>(),
  cards: vi.fn<(id: string) => Promise<Flashcard[]>>(),
  themeSelection: vi.fn<(id: string) => Promise<DeckThemeSelection | null>>(),
  progress: vi.fn(),
}));
vi.mock("@/infrastructure/app-services", () => ({
  useAppServices: () => ({
    deckService: {
      getDetails: async (id: string) => {
        const [deck, cards, themeSelection] = await Promise.all([
          harness.findDeck(id),
          harness.cards(id),
          harness.themeSelection(id),
        ]);
        return { deck, cards, themeSelection };
      },
    },
    flashcardProgressService: { findByFlashcardIds: harness.progress },
  }),
}));
vi.mock("@/features/decks/presentation/context/deck-content-context", () => ({
  useDeckContentRevision: () => ({ revision: 1 }),
}));
vi.mock("@/features/decks/presentation/context/deck-theme-selection-context", () => ({
  useDeckThemeSelectionRevision: () => ({ themeSelectionRevision: 1 }),
}));
vi.mock(
  "@/features/flashcard-progress/presentation/context/learning-progress-revision-context",
  () => ({ useLearningProgressRevision: () => ({ revision: 1 }) })
);

import { useDeckDetails } from "@/features/decks/presentation/controllers/use-deck-details";

import { createQueryWrapper } from "../support/query-client";

type BoundaryProps = Readonly<{ children: ReactNode }>;

/** Stands in for the route boundary that receives load failures. */
class RouteBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error) {
    harness.boundaryError = error;
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function renderDetails(deckId: string, enabled = true) {
  const QueryWrapper = createQueryWrapper();
  return renderHook(() => useDeckDetails(deckId, enabled), {
    wrapper: ({ children }: BoundaryProps) =>
      createElement(RouteBoundary, null, createElement(QueryWrapper, null, children)),
  });
}

afterEach(cleanup);
describe("deck detail loading", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    harness.boundaryError = null;
    harness.findDeck.mockResolvedValue(null);
    harness.cards.mockResolvedValue([]);
    harness.themeSelection.mockResolvedValue(null);
    harness.progress.mockResolvedValue(new Map());
  });

  it("returns an expected missing-deck state instead of throwing into a route boundary", async () => {
    const hook = renderDetails("deleted-deck");
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current).toMatchObject({ deck: null, cards: [] });
    expect(harness.progress).not.toHaveBeenCalled();
    expect(harness.boundaryError).toBeNull();
  });

  it("does not read storage while deletion is running", async () => {
    renderDetails("deleting-deck", false);
    await Promise.resolve();
    expect(harness.findDeck).not.toHaveBeenCalled();
    expect(harness.cards).not.toHaveBeenCalled();
  });

  it("raises genuine storage failures to the route boundary", async () => {
    harness.findDeck.mockRejectedValue(new Error("database unavailable"));
    renderDetails("deck");
    await waitFor(() =>
      expect(harness.boundaryError).toMatchObject({
        code: "VIEW_LOAD_FAILED",
        message: "Could not load deck cards",
      })
    );
  });
});
