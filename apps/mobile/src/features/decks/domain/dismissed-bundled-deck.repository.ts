import type { DeckId } from "@/features/decks/domain/deck.model";

export interface DismissedBundledDeckRepository {
  wasRemoved(id: DeckId): Promise<boolean>;
}
