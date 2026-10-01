import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
export type DeckDetails = Readonly<{
  deck: Deck | null;
  cards: Flashcard[];
  themeSelection: DeckThemeSelection | null;
}>;
export type DeckWithTheme = Readonly<{
  deckId: DeckId;
  deck: Deck | null;
  themeSelection: DeckThemeSelection | null;
}>;
export type DeckCatalogEntry = Readonly<{
  deck: Deck;
  themeSelection: DeckThemeSelection;
  cardCount: number;
}>;
export interface DeckService {
  findById(id: DeckId): Promise<Deck | null>;
  getDetails(id: DeckId): Promise<DeckDetails>;
  getCatalog(): Promise<DeckCatalogEntry[]>;
  findWithThemes(ids: readonly DeckId[]): Promise<DeckWithTheme[]>;
  saveThemeSelection(themeSelection: DeckThemeSelection): Promise<void>;
  remove(id: DeckId): Promise<void>;
}

export interface DeckAudioRemover {
  removeDeck(deckId: DeckId): Promise<void>;
}
