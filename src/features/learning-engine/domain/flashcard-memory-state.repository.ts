import type { LearnerMemoryState } from "./memory-state";

export interface FlashcardMemoryStateRepository {
  findByFlashcardId(flashcardId: string): Promise<LearnerMemoryState | null>;
  findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, LearnerMemoryState>>;
}
