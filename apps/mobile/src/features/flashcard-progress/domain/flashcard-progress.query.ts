import type { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";

export interface FlashcardProgressQuery {
  findIncludingPendingRatings(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, FlashcardProgress>>;
}
