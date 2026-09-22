import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";

export interface FlashcardProgressRepository {
  findByFlashcardId(flashcardId: string): Promise<FlashcardProgress | null>;
  findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, FlashcardProgress>>;
  findIncludingPendingRatingsByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, FlashcardProgress>>;
}
