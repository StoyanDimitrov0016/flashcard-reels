import {
  FlashcardReview,
  type FlashcardReviewFields,
  type RecallLevel,
} from "@/features/study/domain/flashcard-review.model";
import type { ReviewRepository } from "@/features/study/domain/review.repository";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

export class StudyService {
  private readonly reviewRepository: ReviewRepository;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(reviewRepository: ReviewRepository, clock: Clock, idGenerator: IdGenerator) {
    this.reviewRepository = reviewRepository;
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  async listReviews(flashcardId: string): Promise<FlashcardReview[]> {
    return this.reviewRepository.listByFlashcardId(flashcardId);
  }

  async recordReview(flashcardId: string, level: RecallLevel): Promise<void> {
    const reviewFields: FlashcardReviewFields = {
      flashcardId,
      id: this.idGenerator.generate(),
      level,
      reviewedAt: this.clock.now(),
    };
    const review = new FlashcardReview(reviewFields);
    await this.reviewRepository.save(review);
  }
}
