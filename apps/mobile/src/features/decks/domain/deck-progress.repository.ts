import type { PendingDeckProgress } from "@/features/decks/domain/archived-deck-progress";

export interface DeckProgressRepository {
  listPending(): Promise<PendingDeckProgress[]>;
}
