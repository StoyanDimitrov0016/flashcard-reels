import type { PendingDeckProgress } from "@/features/decks/domain/archived-deck-progress";
import type { DeckId } from "@/features/decks/domain/deck.model";

export interface DeckProgressRepository {
  listPending(): Promise<PendingDeckProgress[]>;
  continueProgress(id: DeckId): Promise<void>;
}
