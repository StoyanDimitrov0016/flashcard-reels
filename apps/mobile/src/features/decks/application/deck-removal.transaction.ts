import type { DeckId } from "@/features/decks/domain/deck.model";

export interface DeckRemovalTransaction {
  remove(id: DeckId): Promise<void>;
}
