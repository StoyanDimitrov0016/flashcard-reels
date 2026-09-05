import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

export interface FlashcardRepository {
  countFlashcardsByDeckIds(deckIds: readonly DeckId[]): Promise<ReadonlyMap<DeckId, number>>;
  findById(id: string): Promise<Flashcard | null>;
  list(): Promise<Flashcard[]>;
  listByDeckId(deckId: DeckId): Promise<Flashcard[]>;
  save(flashcard: Flashcard): Promise<void>;
}
