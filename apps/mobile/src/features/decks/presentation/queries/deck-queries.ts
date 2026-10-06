import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query";

import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { DeckDetails, DeckService } from "@/features/decks/domain/deck.service";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import type { FlashcardProgressService } from "@/features/flashcard-progress/domain/flashcard-progress.service";

import { OperationError } from "@/shared/errors/operation-error";

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

type CatalogOptions = Readonly<{
  deckService: DeckService;
  contentRevision: number;
  themeSelectionRevision: number;
}>;
type DetailsOptions = Readonly<{
  deckService: DeckService;
  flashcardProgressService: FlashcardProgressService;
  deckId: DeckId | null;
  enabled: boolean;
  contentRevision: number;
  themeSelectionRevision: number;
  progressRevision: number;
}>;
type MetadataOptions = Readonly<{
  deckService: DeckService;
  deckIds: readonly DeckId[];
  /** When true, a missing deck is an error rather than an absent entry. */
  requireDecks: boolean;
  themeSelectionRevision: number;
}>;

async function loadDetails(
  deckService: DeckService,
  flashcardProgressService: FlashcardProgressService,
  deckId: DeckId
): Promise<DeckDetailsData> {
  const details = await deckService.getDetails(deckId);
  if (!details.deck) {
    return emptyDeckDetails;
  }
  const progress = await flashcardProgressService.findByFlashcardIds(
    details.cards.map((card) => card.id)
  );
  return { ...details, progress };
}

async function loadMetadata({
  deckService,
  deckIds,
  requireDecks,
}: MetadataOptions): Promise<DeckMetadata> {
  const entries = await deckService.findWithThemes(deckIds);
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
 * Deck reads. Keys carry the revisions they depend on until revisions become query invalidation.
 * Screens keep showing the previous result while a new key loads.
 */
export const deckQueries = {
  catalog: ({ deckService, contentRevision, themeSelectionRevision }: CatalogOptions) =>
    queryOptions({
      queryKey: ["decks", "catalog", contentRevision, themeSelectionRevision],
      queryFn: () => deckService.getCatalog(),
      placeholderData: keepPreviousData,
    }),
  details: ({
    deckService,
    flashcardProgressService,
    deckId,
    enabled,
    contentRevision,
    themeSelectionRevision,
    progressRevision,
  }: DetailsOptions) =>
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
        enabled && deckId !== null
          ? () => loadDetails(deckService, flashcardProgressService, deckId)
          : skipToken,
      placeholderData: keepPreviousData,
    }),
  metadata: (options: MetadataOptions) =>
    queryOptions({
      queryKey: [
        "decks",
        "metadata",
        [...options.deckIds],
        options.requireDecks,
        options.themeSelectionRevision,
      ],
      queryFn: () => loadMetadata(options),
      placeholderData: keepPreviousData,
    }),
};
