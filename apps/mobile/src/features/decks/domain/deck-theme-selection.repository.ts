import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { DeckId } from "@/features/decks/domain/deck.model";

export interface DeckThemeSelectionRepository {
  findByDeckId(deckId: DeckId): Promise<DeckThemeSelection | null>;
  findThemeSelectionsByDeckIds(deckIds: readonly DeckId[]): Promise<DeckThemeSelection[]>;
  save(themeSelection: DeckThemeSelection): Promise<void>;
}
