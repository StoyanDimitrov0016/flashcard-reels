import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

export interface FlashcardService {
  findById(id: string): Promise<Flashcard | null>;
  list(): Promise<Flashcard[]>;
  listByDeckId(deckId: DeckId): Promise<Flashcard[]>;
}
