import type { CardProgress } from "@/features/card-progress/domain/card-progress.model";
import type { DeckId } from "@/features/decks/domain/deck.model";

export interface CardProgressRepository {
  findByFlashcardId(flashcardId: string): Promise<CardProgress | null>;
  findByFlashcardIds(flashcardIds: readonly string[]): Promise<ReadonlyMap<string, CardProgress>>;
  findCurrentByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, CardProgress>>;
  resetCard(flashcardId: string, resetAt: string): Promise<void>;
  resetDeck(deckId: DeckId, resetAt: string): Promise<void>;
  resetAll(resetAt: string): Promise<void>;
}
