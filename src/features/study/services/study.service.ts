import { type RecallLevel } from "@/features/study/domain/recall-level";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";
import type { LearnerProfileRepository } from "@/features/learner-profile/domain/learner-profile.repository";
import type { LearnerProfileAggregationTransaction } from "@/features/learner-profile/application/learner-profile-aggregation-transaction";
import {
  AGGREGATION_CHECK_INTERVAL,
  DETAILED_REVIEW_HISTORY_RETENTION,
  EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE,
  FOREGROUND_AGGREGATION_CHUNK_LIMIT,
  PENDING_COMPLETED_SESSION_RECOVERY_LIMIT,
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
  private readonly learnerProfileAggregationTransaction: LearnerProfileAggregationTransaction | null;
  private readonly learnerProfileRepository: LearnerProfileRepository | null;

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
    random: RandomSource = Math.random,
    learnerProfileAggregationTransaction: LearnerProfileAggregationTransaction | null = null,
    learnerProfileRepository: LearnerProfileRepository | null = null
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
    this.learnerProfileAggregationTransaction = learnerProfileAggregationTransaction;
    this.learnerProfileRepository = learnerProfileRepository;
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

    await this.recoverPendingCompletedSessionAggregation();

    const createdAt = this.clock.now();
    const opened = await this.studySessionLifecycleTransaction.open(
      scope,
      deckId,
      replaceExisting,
      strategy,
      createdAt,
      this.idGenerator.generate()
    );
    if (opened.replacedSessionId !== null) {
      await this.finalizeAndAggregateCompletedSession(opened.replacedSessionId);
    }
    await this.aggregateActiveSessionIfEligible(opened.session.id);
    return opened;
  }

  async completeSession(sessionId: string): Promise<void> {
    await this.finalizeAllAttempts(sessionId);
    await this.studySessionRepository.complete(sessionId, this.clock.now());
    await this.aggregateCompletedSession(sessionId);
  }

  async findSession(sessionId: string): Promise<StudySession | null> {
    return this.studySessionRepository.findById(sessionId);
  }

  async findSessionByScope(scope: StudySessionScope): Promise<StudySession | null> {
    return this.studySessionRepository.findActiveByScope(scope);
  }

  async recoverPendingCompletedSessionAggregation(
    limit = PENDING_COMPLETED_SESSION_RECOVERY_LIMIT
  ): Promise<void> {
    if (!this.learnerProfileAggregationTransaction) {
      return;
    }
    const pending =
      await this.studySessionRepository.findCompletedSessionsPendingAggregation(limit);
    const recoverNext = async (index: number): Promise<void> => {
      const session = pending[index];
      if (!session) {
        return;
      }
      await this.aggregateCompletedSession(session.id);
      await recoverNext(index + 1);
    };
    await recoverNext(0);
  }

  async findLearnerProfilesByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, LearnerProfile>> {
    if (!this.learnerProfileRepository) {
      return new Map();
    }
    return this.learnerProfileRepository.findByFlashcardIds(flashcardIds);
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
      ratedAt: null,
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
      await this.aggregateActiveSessionIfEligible(studySessionId);
      return;
    }

    const attempts = await this.reviewAttemptRepository.listUnfinalizedBeforeReelPosition(
      studySessionId,
      firstEditablePosition
    );
    await Promise.all(attempts.map((attempt) => this.finalizeAttempt(attempt.id)));
    await this.aggregateActiveSessionIfEligible(studySessionId);
  }

  private async finalizeAndAggregateCompletedSession(sessionId: string): Promise<void> {
    await this.finalizeAllAttempts(sessionId);
    await this.aggregateCompletedSession(sessionId);
  }

  private async finalizeAllAttempts(studySessionId: string): Promise<void> {
    const maxReelPosition = await this.reviewAttemptRepository.findMaxReelPosition(studySessionId);
    if (maxReelPosition === null) {
      return;
    }
    const attempts = await this.reviewAttemptRepository.listUnfinalizedBeforeReelPosition(
      studySessionId,
      maxReelPosition + 1
    );
    await Promise.all(attempts.map((attempt) => this.finalizeAttempt(attempt.id)));
  }

  private async aggregateActiveSessionIfEligible(studySessionId: string): Promise<void> {
    if (!this.learnerProfileAggregationTransaction) {
      return;
    }
    const eligibility = await this.getAggregationEligibility(studySessionId);
    if (!eligibility?.shouldCheck) {
      return;
    }
    await this.learnerProfileAggregationTransaction.aggregate(
      studySessionId,
      eligibility.safeThroughReelPosition,
      this.clock.now()
    );
  }

  private async aggregateCompletedSession(studySessionId: string): Promise<void> {
    const aggregation = this.learnerProfileAggregationTransaction;
    if (!aggregation) {
      return;
    }
    const maximumAttemptPosition =
      await this.reviewAttemptRepository.findMaxReelPosition(studySessionId);
    if (maximumAttemptPosition === null) {
      return;
    }

    const aggregateNextChunk = async (
      remainingChunks: number,
      session: StudySession | null
    ): Promise<void> => {
      if (
        remainingChunks <= 0 ||
        !session ||
        session.aggregatedThroughReelPosition >= maximumAttemptPosition
      ) {
        return;
      }
      const result = await aggregation.aggregate(
        studySessionId,
        maximumAttemptPosition,
        this.clock.now()
      );
      if (result.throughReelPosition <= session.aggregatedThroughReelPosition) {
        return;
      }
      await aggregateNextChunk(
        remainingChunks - 1,
        await this.studySessionRepository.findById(studySessionId)
      );
    };
    await aggregateNextChunk(
      FOREGROUND_AGGREGATION_CHUNK_LIMIT,
      await this.studySessionRepository.findById(studySessionId)
    );
  }
}
