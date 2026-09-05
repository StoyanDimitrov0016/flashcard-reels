import type { Deck, DeckId } from "@/features/decks/domain/deck.model";

export interface DeckRepository {
  findById(id: DeckId): Promise<Deck | null>;
  findByIds(ids: readonly DeckId[]): Promise<Deck[]>;
  list(): Promise<Deck[]>;
  save(deck: Deck): Promise<void>;
}
