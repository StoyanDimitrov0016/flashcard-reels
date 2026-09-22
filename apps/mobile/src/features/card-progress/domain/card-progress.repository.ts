import type { CardProgress } from "@/features/card-progress/domain/card-progress.model";

export interface CardProgressRepository {
  findByFlashcardId(flashcardId: string): Promise<CardProgress | null>;
  findByFlashcardIds(flashcardIds: readonly string[]): Promise<ReadonlyMap<string, CardProgress>>;
  findIncludingPendingRatingsByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, CardProgress>>;
}
