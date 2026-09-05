import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { DeckId } from "@/features/decks/domain/deck.model";

export interface DeckAppearanceRepository {
  findByDeckId(deckId: DeckId): Promise<DeckAppearance | null>;
  findAppearancesByDeckIds(deckIds: readonly DeckId[]): Promise<DeckAppearance[]>;
  save(appearance: DeckAppearance): Promise<void>;
}
