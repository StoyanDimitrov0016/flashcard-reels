import type {
  ArchivedDeckProgress,
  PendingDeckProgress,
} from "@/features/decks/domain/archived-deck-progress";
import type { DeckId } from "@/features/decks/domain/deck.model";

export interface SavedProgressService {
  listArchivedProgress(): Promise<ArchivedDeckProgress[]>;
  listPendingProgress(): Promise<PendingDeckProgress[]>;
  continueProgress(id: DeckId): Promise<void>;
  deleteProgress(id: DeckId): Promise<void>;
}
