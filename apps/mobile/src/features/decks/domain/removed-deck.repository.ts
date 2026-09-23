import type { DeckId } from "@/features/decks/domain/deck.model";

export interface RemovedDeckRepository {
  wasRemoved(id: DeckId): Promise<boolean>;
}
