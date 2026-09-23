import type { DeckId } from "@/features/decks/domain/deck.model";

export interface LearningProgressResetTransaction {
  resetCard(flashcardId: string, resetAt: string): Promise<void>;
  resetDeck(deckId: DeckId, resetAt: string): Promise<void>;
  resetAll(resetAt: string): Promise<void>;
}
