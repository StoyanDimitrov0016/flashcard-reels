import type { FlashcardMemoryState } from "./flashcard-memory-state";

export interface FlashcardMemoryStateRepository {
  findByFlashcardId(flashcardId: string): Promise<FlashcardMemoryState | null>;
  findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, FlashcardMemoryState>>;
}
