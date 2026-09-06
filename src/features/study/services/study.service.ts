import { type RecallLevel } from "@/features/study/domain/recall-level";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import {
  AGGREGATION_CHECK_INTERVAL,
  DETAILED_REVIEW_HISTORY_RETENTION,
  EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE,
} from "@/features/study/config/review-attempts";
import { calculateRecurrenceTarget, type RandomSource } from "@/features/study/config/recurrences";
import type { ReviewAttemptRepository } from "@/features/study/domain/review-attempt.repository";
import type { ReviewAttemptTransaction } from "@/features/study/services/review-attempt-transaction";
import type { StudySessionFeedTransaction } from "@/features/study/services/study-session-feed-transaction";
import type {
  OpenStudySessionResult,
  StudySessionLifecycleTransaction,
} from "@/features/study/services/study-session-lifecycle-transaction";
import { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudySessionItemRepository } from "@/features/study/domain/study-session-item.repository";
import { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionRecurrenceRepository } from "@/features/study/domain/study-session-recurrence.repository";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionStrategy } from "@/features/study/domain/study-session-strategy";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

export type OpenStudySession = OpenStudySessionResult;

export class StudyService {
  private readonly reviewAttemptRepository: ReviewAttemptRepository;
  private readonly studySessionRecurrenceRepository: StudySessionRecurrenceRepository;
  private readonly studySessionRepository: StudySessionRepository;
  private readonly studySessionItemRepository: StudySessionItemRepository;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;
  private readonly random: RandomSource;
  private readonly reviewAttemptTransaction: ReviewAttemptTransaction;
  private readonly studySessionFeedTransaction: StudySessionFeedTransaction;
  private readonly studySessionLifecycleTransaction: StudySessionLifecycleTransaction;

  constructor(
    reviewAttemptRepository: ReviewAttemptRepository,
    studySessionRepository: StudySessionRepository,
    studySessionItemRepository: StudySessionItemRepository,
    studySessionRecurrenceRepository: StudySessionRecurrenceRepository,
    clock: Clock,
    idGenerator: IdGenerator,
    reviewAttemptTransaction: ReviewAttemptTransaction,
    studySessionFeedTransaction: StudySessionFeedTransaction,
    studySessionLifecycleTransaction: StudySessionLifecycleTransaction,
    random: RandomSource = Math.random
  ) {
    this.reviewAttemptRepository = reviewAttemptRepository;
    this.studySessionRecurrenceRepository = studySessionRecurrenceRepository;
    this.studySessionRepository = studySessionRepository;
    this.studySessionItemRepository = studySessionItemRepository;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.reviewAttemptTransaction = reviewAttemptTransaction;
    this.studySessionFeedTransaction = studySessionFeedTransaction;
    this.studySessionLifecycleTransaction = studySessionLifecycleTransaction;
    this.random = random;
  }

  async openSession(
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExisting: boolean,
    strategy: StudySessionStrategy = "shuffle"
  ): Promise<OpenStudySession> {
    if ((scope === "mixed" && deckId !== null) || (scope === "focused" && deckId === null)) {
      throw new Error("Study session scope and deck must agree");
    }
    if (scope === "mixed" && strategy !== "shuffle") {
      throw new Error("Mixed sessions only support the shuffle strategy");
    }

    const createdAt = this.clock.now();
    return this.studySessionLifecycleTransaction.open(
      scope,
      deckId,
      replaceExisting,
      strategy,
      createdAt,
      this.idGenerator.generate()
    );
  }

  async completeSession(sessionId: string): Promise<void> {
    await this.studySessionRepository.complete(sessionId, this.clock.now());
  }

  async findSession(sessionId: string): Promise<StudySession | null> {
    return this.studySessionRepository.findById(sessionId);
  }

  async findSessionByScope(scope: StudySessionScope): Promise<StudySession | null> {
    return this.studySessionRepository.findActiveByScope(scope);
  }

  /** Returns aggregation eligibility; it never advances the durable checkpoint. */
  async getAggregationEligibility(sessionId: string): Promise<Readonly<{
    shouldCheck: boolean;
    safeThroughReelPosition: number;
  }> | null> {
    const session = await this.studySessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }

    const candidate = session.currentReelPosition - DETAILED_REVIEW_HISTORY_RETENTION;
    if (candidate <= session.aggregatedThroughReelPosition) {
      return {
        safeThroughReelPosition: session.aggregatedThroughReelPosition,
        shouldCheck: false,
      };
    }

    const unfinished = await this.reviewAttemptRepository.listUnfinalizedBeforeReelPosition(
      sessionId,
      candidate + 1
    );
    const safeThroughReelPosition = unfinished.reduce(
      (safePosition, attempt) => Math.min(safePosition, attempt.reelPosition - 1),
      candidate
    );
    return {
      safeThroughReelPosition,
      shouldCheck:
        safeThroughReelPosition > session.aggregatedThroughReelPosition &&
        safeThroughReelPosition - session.aggregatedThroughReelPosition >=
          AGGREGATION_CHECK_INTERVAL,
    };
  }

  async appendSessionItems(
    sessionId: string,
    cards: readonly Flashcard[],
    strategyState: string,
    baseFeedPositionStart = 0,
    reelPositions = cards.map((_card, index) => baseFeedPositionStart + index)
  ): Promise<void> {
    if (cards.length !== reelPositions.length) {
      throw new Error("Session item cards and reel positions must have the same length");
    }
    const items = cards.map(
      (card, index) =>
        new StudySessionItem({
          flashcardId: card.id,
          id: this.idGenerator.generate(),
          baseFeedPosition: baseFeedPositionStart + index,
          reelPosition: reelPositions[index] ?? 0,
          studySessionId: sessionId,
        })
    );
    await this.studySessionFeedTransaction.append(sessionId, items, strategyState);
  }

  async listSessionItems(sessionId: string): Promise<StudySessionItem[]> {
    return this.studySessionItemRepository.listBySessionId(sessionId);
  }

  async findMaxSessionBaseFeedPosition(sessionId: string): Promise<number | null> {
    return this.studySessionItemRepository.findMaxBaseFeedPosition(sessionId);
  }

  async findMaxSessionReelPosition(sessionId: string): Promise<number | null> {
    return this.studySessionItemRepository.findMaxReelPosition(sessionId);
  }

  async listSessionItemsInReelPositionRange(
    sessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<StudySessionItem[]> {
    return this.studySessionItemRepository.listBySessionIdInReelPositionRange(
      sessionId,
      fromReelPosition,
      throughReelPosition
    );
  }

  async listSessionRecurrences(sessionId: string): Promise<StudySessionRecurrence[]> {
    return this.studySessionRecurrenceRepository.listBySessionId(sessionId);
  }

  async listPendingRecurrenceFlashcardIdsFromTargetPosition(
    sessionId: string,
    fromTargetReelPosition: number
  ): Promise<string[]> {
    return this.studySessionRecurrenceRepository.listPendingFlashcardIdsFromTargetPosition(
      sessionId,
      fromTargetReelPosition
    );
  }

  async listSessionRecurrencesInTargetRange(
    sessionId: string,
    fromTargetReelPosition: number,
    throughTargetReelPosition: number
  ): Promise<StudySessionRecurrence[]> {
    return this.studySessionRecurrenceRepository.listBySessionIdInTargetRange(
      sessionId,
      fromTargetReelPosition,
      throughTargetReelPosition
    );
  }

  async updateSessionReelPosition(
    sessionId: string,
    currentReelPosition: number
  ): Promise<boolean> {
    return this.studySessionRepository.updateCurrentReelPosition(
      sessionId,
      currentReelPosition,
      this.clock.now()
    );
  }

  async startAttempt(
    flashcardId: string,
    reelPosition: number,
    studySessionId: string
  ): Promise<string> {
    const existingAttempt = await this.reviewAttemptRepository.findBySessionAndReelPosition(
      studySessionId,
      reelPosition
    );
    if (existingAttempt) {
      return existingAttempt.id;
    }

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

  async listReviewAttemptsInReelPositionRange(
    sessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<FlashcardReviewAttempt[]> {
    return this.reviewAttemptRepository.listBySessionAndReelPositionRange(
      sessionId,
      fromReelPosition,
      throughReelPosition
    );
  }

  async rateAttempt(attemptId: string, rating: RecallLevel): Promise<boolean> {
    const attempt = await this.reviewAttemptRepository.findById(attemptId);
    if (!attempt || attempt.finalizedAt !== null) {
      return false;
    }

    const updatedAt = this.clock.now();
    const proposedTargetReelPosition = calculateRecurrenceTarget(
      attempt.reelPosition,
      rating,
      this.random
    );
    const recurrence =
      proposedTargetReelPosition === null
        ? null
        : new StudySessionRecurrence({
            consumedAt: null,
            createdAt: updatedAt,
            flashcardId: attempt.flashcardId,
            id: this.idGenerator.generate(),
            sourceAttemptId: attempt.id,
            studySessionId: attempt.studySessionId,
            targetReelPosition: proposedTargetReelPosition,
          });

    return this.reviewAttemptTransaction.rateAttempt(
      attemptId,
      rating,
      updatedAt,
      recurrence,
      proposedTargetReelPosition
    );
  }

  async consumeRecurrence(recurrenceId: string): Promise<boolean> {
    return this.studySessionRecurrenceRepository.markConsumed(recurrenceId, this.clock.now());
  }

  async finalizeAttempt(attemptId: string): Promise<void> {
    const finalizedAt = this.clock.now();
    await this.reviewAttemptRepository.finalize(attemptId, finalizedAt, finalizedAt);
  }

  async finalizeAttemptsOutsideEditableWindow(
    studySessionId: string,
    reelPosition: number
  ): Promise<void> {
    const firstEditablePosition = reelPosition - EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE + 1;
    if (firstEditablePosition <= 0) {
      return;
    }

    const attempts = await this.reviewAttemptRepository.listUnfinalizedBeforeReelPosition(
      studySessionId,
      firstEditablePosition
    );
    await Promise.all(attempts.map((attempt) => this.finalizeAttempt(attempt.id)));
  }
}
