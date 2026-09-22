import type {
  ArchivedDeckProgress,
  PendingDeckProgress,
} from "@/features/decks/domain/archived-deck-progress";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";

export interface DeckRepository {
  findVersion(id: DeckId): Promise<number | null>;
  findById(id: DeckId): Promise<Deck | null>;
  findByIds(ids: readonly DeckId[]): Promise<Deck[]>;
  list(): Promise<Deck[]>;
  remove(id: DeckId): Promise<void>;
  save(deck: Deck): Promise<void>;
  wasRemoved(id: DeckId): Promise<boolean>;
  listArchivedProgress(): Promise<ArchivedDeckProgress[]>;
  listPendingProgress(): Promise<PendingDeckProgress[]>;
  continueProgress(id: DeckId): Promise<void>;
  deleteProgress(id: DeckId): Promise<void>;
}
