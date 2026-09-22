import type {
  ArchivedDeckProgress,
  PendingDeckProgress,
} from "@/features/decks/domain/archived-deck-progress";
import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { Deck, DeckId } from "@/features/decks/domain/deck.model";

export interface DeckService {
  findById(id: DeckId): Promise<Deck | null>;
  findByIds(ids: readonly DeckId[]): Promise<Deck[]>;
  getAppearance(deckId: DeckId): Promise<DeckAppearance | null>;
  getAppearances(deckIds: readonly DeckId[]): Promise<DeckAppearance[]>;
  saveAppearance(appearance: DeckAppearance): Promise<void>;
  list(): Promise<Deck[]>;
  remove(id: DeckId): Promise<void>;
  listArchivedProgress(): Promise<ArchivedDeckProgress[]>;
  listPendingProgress(): Promise<PendingDeckProgress[]>;
  continueProgress(id: DeckId): Promise<void>;
  deleteProgress(id: DeckId): Promise<void>;
}

export interface DeckAudioRemover {
  removeDeck(deckId: DeckId): Promise<void>;
}
