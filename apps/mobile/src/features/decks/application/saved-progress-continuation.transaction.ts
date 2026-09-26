import type { DeckId } from "@/features/decks/domain/deck.model";

export interface SavedProgressContinuationTransaction {
  continueProgress(id: DeckId): Promise<void>;
}
