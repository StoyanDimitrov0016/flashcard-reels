import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query";

import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { DeckDetails } from "@/features/decks/domain/deck.service";
import type { DecksCapability } from "@/features/decks/presentation/dependencies/use-decks";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";

import { OperationError } from "@/shared/errors/operation-error";
import { loadViewData } from "@/shared/presentation/query/load-view-data";

type DeckQueryServices = Pick<DecksCapability, "deckService" | "flashcardProgressService">;

export type DeckDetailsData = DeckDetails &
  Readonly<{ progress: ReadonlyMap<string, FlashcardProgress> }>;
export type DeckMetadata = Readonly<{
  decks: ReadonlyMap<DeckId, Deck>;
  themeSelections: ReadonlyMap<DeckId, DeckThemeSelection>;
}>;

export const emptyDeckDetails: DeckDetailsData = {
  deck: null,
  cards: [],
  themeSelection: null,
  progress: new Map(),
};

type DeckRevisions = Readonly<{
  contentRevision: number;
  themeSelectionRevision: number;
  progressRevision: number;
}>;

async function loadDetails(services: DeckQueryServices, deckId: DeckId): Promise<DeckDetailsData> {
  const details = await services.deckService.getDetails(deckId);
  if (!details.deck) {
    return emptyDeckDetails;
  }
  const progress = await services.flashcardProgressService.findByFlashcardIds(
    details.cards.map((card) => card.id)
  );
  return { ...details, progress };
}

async function loadMetadata(
  services: DeckQueryServices,
  deckIds: readonly DeckId[],
  requireDecks: boolean
): Promise<DeckMetadata> {
  const entries = await services.deckService.findWithThemes(deckIds);
  const decks = new Map(
    entries.flatMap((entry) => (entry.deck ? [[entry.deck.id, entry.deck] as const] : []))
  );
  const themeSelections = new Map<DeckId, DeckThemeSelection>();
  for (const id of deckIds) {
    if (requireDecks && !decks.has(id)) {
      throw new OperationError({
        code: "DECK_NOT_FOUND",
        context: { deckId: id, operation: "decks.load" },
        message: "Missing deck " + id,
      });
    }
    const theme = entries.find((entry) => entry.deckId === id)?.themeSelection;
    if (!theme) {
      throw new OperationError({
        code: "VIEW_LOAD_FAILED",
        context: { deckId: id, operation: "deck-theme-selections.load" },
        message: "Missing theme selection for deck " + id,
      });
    }
    themeSelections.set(id, theme);
  }
  return { decks, themeSelections };
}

/**
 * Deck reads. `services` are stable dependencies; every other input is part of the key.
 * Screens keep showing the previous result while a new key loads.
 */
export const deckQueries = {
  catalog: (
    services: DeckQueryServices,
    { contentRevision, themeSelectionRevision }: Omit<DeckRevisions, "progressRevision">
  ) =>
    queryOptions({
      queryKey: ["decks", "catalog", contentRevision, themeSelectionRevision],
      queryFn: () =>
        loadViewData({ operation: "deck-catalog.load", message: "Could not load decks" }, () =>
          services.deckService.getCatalog()
        ),
      placeholderData: keepPreviousData,
    }),
  details: (
    services: DeckQueryServices,
    deckId: DeckId | null,
    { contentRevision, themeSelectionRevision, progressRevision }: DeckRevisions
  ) =>
    queryOptions({
      queryKey: [
        "decks",
        "details",
        deckId,
        contentRevision,
        themeSelectionRevision,
        progressRevision,
      ],
      queryFn:
        deckId === null
          ? skipToken
          : () =>
              loadViewData(
                {
                  operation: "deck-details.load",
                  message: "Could not load deck cards",
                  context: { deckId },
                },
                () => loadDetails(services, deckId)
              ),
      placeholderData: keepPreviousData,
    }),
  metadata: (
    services: DeckQueryServices,
    deckIds: readonly DeckId[],
    requireDecks: boolean,
    themeSelectionRevision: number
  ) =>
    queryOptions({
      queryKey: ["decks", "metadata", deckIds, requireDecks, themeSelectionRevision],
      queryFn: () =>
        loadViewData({ operation: "decks.load", message: "Could not load decks" }, () =>
          loadMetadata(services, deckIds, requireDecks)
        ),
      placeholderData: keepPreviousData,
    }),
};
