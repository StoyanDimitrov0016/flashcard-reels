import type { DeckId } from "@/features/decks/domain/deck.model";

export interface SavedProgressDeletionTransaction {
  deleteProgress(id: DeckId): Promise<void>;
}
