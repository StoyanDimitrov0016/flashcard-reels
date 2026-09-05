import { type RecallLevel } from "@/features/study/domain/flashcard-review.model";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import { EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE } from "@/features/study/config/review-attempts";
import type { ReviewAttemptRepository } from "@/features/study/domain/review-attempt.repository";
import { StudySession, type StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

export class StudyService {
  private readonly reviewAttemptRepository: ReviewAttemptRepository;
  private readonly studySessionRepository: StudySessionRepository;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;

  constructor(
    reviewAttemptRepository: ReviewAttemptRepository,
    studySessionRepository: StudySessionRepository,
    clock: Clock,
    idGenerator: IdGenerator
  ) {
    this.reviewAttemptRepository = reviewAttemptRepository;
    this.studySessionRepository = studySessionRepository;
    this.clock = clock;
    this.idGenerator = idGenerator;
  }

  async openSession(
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExisting: boolean
  ): Promise<StudySession> {
    if ((scope === "mixed" && deckId !== null) || (scope === "focused" && deckId === null)) {
      throw new Error("Study session scope and deck must agree");
    }

    const createdAt = this.clock.now();
    if (replaceExisting) {
      await this.studySessionRepository.completeActiveByScope(scope, createdAt);
    }

    const activeSession = await this.studySessionRepository.findActive(scope, deckId);
    if (activeSession) {
      return activeSession;
    }

    const session = new StudySession({
      completedAt: null,
      createdAt,
      currentPosition: 0,
      deckId,
      id: this.idGenerator.generate(),
      scope,
    });
    await this.studySessionRepository.create(session);
    return session;
  }

  async updateSessionPosition(sessionId: string, currentPosition: number): Promise<boolean> {
    return this.studySessionRepository.updateCurrentPosition(sessionId, currentPosition);
  }

  async startAttempt(
    flashcardId: string,
    reelPosition: number,
    studySessionId: string
  ): Promise<string> {
    const createdAt = this.clock.now();
    const attempt = new FlashcardReviewAttempt({
      createdAt,
      flashcardId,
      finalizedAt: null,
      id: this.idGenerator.generate(),
      reelPosition,
      rating: null,
      studySessionId,
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
