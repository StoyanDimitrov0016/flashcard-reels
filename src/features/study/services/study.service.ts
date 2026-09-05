import { type RecallLevel } from "@/features/study/domain/flashcard-review.model";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import { EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE } from "@/features/study/config/review-attempts";
import type { ReviewAttemptRepository } from "@/features/study/domain/review-attempt.repository";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

export class StudyService {
  private readonly reviewAttemptRepository: ReviewAttemptRepository;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(
    reviewAttemptRepository: ReviewAttemptRepository,
    clock: Clock,
    idGenerator: IdGenerator
  ) {
    this.reviewAttemptRepository = reviewAttemptRepository;
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  async startAttempt(flashcardId: string, reelPosition: number): Promise<string> {
    const createdAt = this.clock.now();
    const attempt = new FlashcardReviewAttempt({
      createdAt,
      flashcardId,
      finalizedAt: null,
      id: this.idGenerator.generate(),
      reelPosition,
      rating: null,
      updatedAt: createdAt,
    });
    await this.reviewAttemptRepository.create(attempt);
    return attempt.id;
  }

  async rateAttempt(attemptId: string, rating: RecallLevel): Promise<boolean> {
    return this.reviewAttemptRepository.updateRating(attemptId, rating, this.clock.now());
  }

  async finalizeAttempt(attemptId: string): Promise<void> {
    const finalizedAt = this.clock.now();
    await this.reviewAttemptRepository.finalize(attemptId, finalizedAt, finalizedAt);
  }

  async finalizeAttemptsOutsideEditableWindow(reelPosition: number): Promise<void> {
    const firstEditablePosition = reelPosition - EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE + 1;
    if (firstEditablePosition <= 0) {
      return;
    }

    const attempts =
      await this.reviewAttemptRepository.listUnfinalizedBeforeReelPosition(firstEditablePosition);
    await Promise.all(attempts.map((attempt) => this.finalizeAttempt(attempt.id)));
  }
}
