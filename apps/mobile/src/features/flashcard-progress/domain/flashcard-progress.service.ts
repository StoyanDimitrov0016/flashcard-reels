import type { DeckId } from "@/features/decks/domain/deck.model";
import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";

export interface FlashcardProgressService {
  findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, FlashcardProgress>>;
  resetFlashcardProgress(flashcardId: string): Promise<void>;
  resetDeckProgress(deckId: DeckId): Promise<void>;
  resetAllProgress(): Promise<void>;
}
