import type { FlashcardReview } from "@/features/study/domain/flashcard-review.model";

export interface ReviewRepository {
  listByFlashcardId(flashcardId: string): Promise<FlashcardReview[]>;
  save(review: FlashcardReview): Promise<void>;
}
