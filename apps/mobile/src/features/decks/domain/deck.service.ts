import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";

export interface DeckService {
  findById(id: DeckId): Promise<Deck | null>;
  findByIds(ids: readonly DeckId[]): Promise<Deck[]>;
  getThemeSelection(deckId: DeckId): Promise<DeckThemeSelection | null>;
  getThemeSelections(deckIds: readonly DeckId[]): Promise<DeckThemeSelection[]>;
  saveThemeSelection(themeSelection: DeckThemeSelection): Promise<void>;
  list(): Promise<Deck[]>;
  remove(id: DeckId): Promise<void>;
}

export interface DeckAudioRemover {
  removeDeck(deckId: DeckId): Promise<void>;
}
