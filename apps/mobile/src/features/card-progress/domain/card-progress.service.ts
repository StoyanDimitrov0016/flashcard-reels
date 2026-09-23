import type { CardProgress } from "@/features/card-progress/domain/card-progress.model";
import type { DeckId } from "@/features/decks/domain/deck.model";

export interface CardProgressService {
  findByFlashcardIds(flashcardIds: readonly string[]): Promise<ReadonlyMap<string, CardProgress>>;
  resetCardProgress(flashcardId: string): Promise<void>;
  resetDeckProgress(deckId: DeckId): Promise<void>;
  resetAllProgress(): Promise<void>;
}
