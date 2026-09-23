import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

export interface FlashcardAvailabilityQuery {
  listAvailableFlashcards(): Promise<Flashcard[]>;
  listAvailableFlashcardsByDeckId(deckId: DeckId): Promise<Flashcard[]>;
}
