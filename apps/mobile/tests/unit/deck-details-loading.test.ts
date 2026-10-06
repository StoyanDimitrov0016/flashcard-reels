/** @vitest-environment jsdom */
import { skipToken } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { Deck } from "@/features/decks/domain/deck.model";
import type { DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardProgressService } from "@/features/flashcard-progress/domain/flashcard-progress.service";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { deckQueries, emptyDeckDetails } from "@/features/decks/presentation/queries/deck-queries";
import { createQueryClient } from "@/shared/presentation/query-client";

const services = vi.hoisted(() => ({
  findDeck: vi.fn<(id: string) => Promise<Deck | null>>(),
  cards: vi.fn<(id: string) => Promise<Flashcard[]>>(),
  themeSelection: vi.fn<(id: string) => Promise<DeckThemeSelection | null>>(),
  progress: vi.fn(),
}));
const deckService = {
  getDetails: async (id: string) => {
    const [deck, cards, themeSelection] = await Promise.all([
      services.findDeck(id),
      services.cards(id),
      services.themeSelection(id),
    ]);
    return { deck, cards, themeSelection };
  },
} as Pick<DeckService, "getDetails"> as DeckService;
const flashcardProgressService = {
  findByFlashcardIds: services.progress,
} as Pick<FlashcardProgressService, "findByFlashcardIds"> as FlashcardProgressService;

vi.mock("@/infrastructure/app-services", () => ({
  useAppServices: () => ({ deckService, flashcardProgressService }),
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

function detailsQuery(deckId: string, enabled = true) {
  return deckQueries.details({
    deckService,
    flashcardProgressService,
    deckId,
    enabled,
    contentRevision: 1,
    themeSelectionRevision: 1,
    progressRevision: 1,
  });
}

afterEach(cleanup);
describe("deck detail loading", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    services.findDeck.mockResolvedValue(null);
    services.cards.mockResolvedValue([]);
    services.themeSelection.mockResolvedValue(null);
    services.progress.mockResolvedValue(new Map());
  });

  it("returns an expected missing-deck state instead of throwing into a route boundary", async () => {
    const hook = renderHook(() => useDeckDetails("deleted-deck"), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current).toMatchObject({ deck: null, cards: [], error: null });
    expect(services.progress).not.toHaveBeenCalled();
  });

  it("does not read storage while deletion is running", () => {
    expect(detailsQuery("deleting-deck", false).queryFn).toBe(skipToken);
  });

  it("propagates genuine storage failures", async () => {
    services.findDeck.mockRejectedValue(new Error("database unavailable"));
    await expect(createQueryClient().fetchQuery(detailsQuery("deck"))).rejects.toThrow(
      "database unavailable"
    );
  });

  it("returns the empty state for a deck removed between reads", async () => {
    await expect(createQueryClient().fetchQuery(detailsQuery("deck"))).resolves.toBe(
      emptyDeckDetails
    );
  });
});
