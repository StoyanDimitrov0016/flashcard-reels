import { type RecallLevel } from "@/features/study/domain/recall-level";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { LearnerProfileAggregationTransaction } from "@/features/learner-profile/application/learner-profile-aggregation-transaction";
import type { StudyService } from "@/features/study/domain/study.service";
import {
  AGGREGATION_CHECK_INTERVAL,
  DETAILED_REVIEW_HISTORY_RETENTION,
  EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE,
  FOREGROUND_AGGREGATION_CHUNK_LIMIT,
  PENDING_COMPLETED_SESSION_RECOVERY_LIMIT,
  PERSISTED_SESSION_FEED_HISTORY_LIMIT,
  SESSION_COMPACTION_INTERVAL,
} from "@/features/study/domain/review-attempts";
import { calculateRecurrenceTarget, type RandomSource } from "@/features/study/domain/recurrences";
import type { ReviewAttemptRepository } from "@/features/study/domain/review-attempt.repository";
import type { ReviewAttemptTransaction } from "@/features/study/application/review-attempt-transaction";
import type { ReviewAttemptFinalizationTransaction } from "@/features/study/application/review-attempt-finalization-transaction";
import {
  compareRatedAttempts,
  isRatedReviewAttempt,
  orderReviewAttemptsForFinalization,
} from "@/features/study/application/review-attempt-finalization-order";
import type { StudySessionFeedTransaction } from "@/features/study/application/study-session-feed-transaction";
import type { StudySessionMaintenanceTransaction } from "@/features/study/application/study-session-maintenance-transaction";
import type {
  OpenStudySessionResult,
  StudySessionLifecycleTransaction,
} from "@/features/study/application/study-session-lifecycle-transaction";
import { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudySessionItemRepository } from "@/features/study/domain/study-session-item.repository";
import { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionRecurrenceRepository } from "@/features/study/domain/study-session-recurrence.repository";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

export type OpenStudySession = OpenStudySessionResult;

export class StudyServiceImpl implements StudyService {
  private readonly reviewAttemptRepository: ReviewAttemptRepository;
  private readonly studySessionRecurrenceRepository: StudySessionRecurrenceRepository;
  private readonly studySessionRepository: StudySessionRepository;
  private readonly studySessionItemRepository: StudySessionItemRepository;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;
  private readonly random: RandomSource;
  private readonly reviewAttemptTransaction: ReviewAttemptTransaction;
  private readonly reviewAttemptFinalizationTransaction: ReviewAttemptFinalizationTransaction;
  private readonly studySessionFeedTransaction: StudySessionFeedTransaction;
  private readonly studySessionLifecycleTransaction: StudySessionLifecycleTransaction;
  private readonly learnerProfileAggregationTransaction: LearnerProfileAggregationTransaction | null;
  private readonly studySessionMaintenanceTransaction: StudySessionMaintenanceTransaction | null;
  private readonly finalizationQueues = new Map<string, Promise<void>>();
  private readonly compactionWatermarks = new Map<string, number>();

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
    reviewAttemptFinalizationTransaction: ReviewAttemptFinalizationTransaction,
    random: RandomSource = Math.random,
    learnerProfileAggregationTransaction: LearnerProfileAggregationTransaction | null = null,
    studySessionMaintenanceTransaction: StudySessionMaintenanceTransaction | null = null
  ) {
    this.reviewAttemptRepository = reviewAttemptRepository;
    this.studySessionRecurrenceRepository = studySessionRecurrenceRepository;
    this.studySessionRepository = studySessionRepository;
    this.studySessionItemRepository = studySessionItemRepository;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.reviewAttemptTransaction = reviewAttemptTransaction;
    this.reviewAttemptFinalizationTransaction = reviewAttemptFinalizationTransaction;
    this.studySessionFeedTransaction = studySessionFeedTransaction;
    this.studySessionLifecycleTransaction = studySessionLifecycleTransaction;
    this.random = random;
    this.learnerProfileAggregationTransaction = learnerProfileAggregationTransaction;
    this.studySessionMaintenanceTransaction = studySessionMaintenanceTransaction;
  }

  async openSession(
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExisting: boolean
  ): Promise<OpenStudySession> {
    if ((scope === "mixed" && deckId !== null) || (scope === "focused" && deckId === null)) {
      throw new Error("Study session scope and deck must agree");
    }
    await this.recoverPendingCompletedSessionAggregation();

    const createdAt = this.clock.now();
    const opened = await this.studySessionLifecycleTransaction.open(
      scope,
      deckId,
      replaceExisting,
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

  async compactSessionRuntimeData(sessionId: string): Promise<void> {
    const maintenance = this.studySessionMaintenanceTransaction;
    if (!maintenance) {
      return;
    }
    const session = await this.studySessionRepository.findById(sessionId);
    if (!session) {
      return;
    }
    const compactionBoundary = Math.floor(
      session.furthestReelPosition / SESSION_COMPACTION_INTERVAL
    );
    const previousBoundary = this.compactionWatermarks.get(sessionId);
    if (previousBoundary !== undefined && compactionBoundary <= previousBoundary) {
      return;
    }
    const minimumRetainedReelPosition =
      session.furthestReelPosition - PERSISTED_SESSION_FEED_HISTORY_LIMIT;
    if (minimumRetainedReelPosition > 0) {
      await maintenance.compact(sessionId, minimumRetainedReelPosition);
    }
    this.compactionWatermarks.set(sessionId, compactionBoundary);
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

  /** Returns aggregation eligibility; it never advances the durable checkpoint. */
  async getAggregationEligibility(sessionId: string): Promise<Readonly<{
    shouldCheck: boolean;
    safeThroughReelPosition: number;
  }> | null> {
    const session = await this.studySessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }

    const candidate = session.furthestReelPosition - DETAILED_REVIEW_HISTORY_RETENTION;
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
    feedState: string,
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
    await this.studySessionFeedTransaction.append(sessionId, items, feedState);
  }

  async updateSessionFeedState(sessionId: string, feedState: string): Promise<void> {
    await this.studySessionFeedTransaction.updateState(sessionId, feedState);
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

  async updateSessionReelPosition(sessionId: string, currentReelPosition: number) {
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
    const session = await this.studySessionRepository.findById(studySessionId);
    if (!session || session.completedAt !== null) {
      throw new Error(`Cannot start a review attempt for inactive session ${studySessionId}`);
    }

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
    const attempt = await this.reviewAttemptRepository.findById(attemptId);
    if (!attempt) {
      return;
    }
    await this.serializeFinalization(attempt.studySessionId, async () => {
      const currentAttempt = await this.reviewAttemptRepository.findById(attemptId);
      if (!currentAttempt || currentAttempt.finalizedAt !== null) {
        return;
      }
      const allUnfinalized = await this.reviewAttemptRepository.listUnfinalizedBySessionId(
        currentAttempt.studySessionId
      );
      const remainingIds = new Set(allUnfinalized.map((candidate) => candidate.id));
      if (this.isBlockedByEarlierReview(currentAttempt, allUnfinalized, remainingIds)) {
        return;
      }
      await this.finalizeAttemptNow(currentAttempt.id);
    });
  }

  async finalizeAttemptsOutsideEditableWindow(studySessionId: string): Promise<void> {
    await this.serializeFinalization(studySessionId, async () => {
      const session = await this.studySessionRepository.findById(studySessionId);
      if (!session) {
        return;
      }
      const firstEditablePosition =
        session.furthestReelPosition - EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE + 1;
      if (firstEditablePosition > 0) {
        const attempts = await this.reviewAttemptRepository.listUnfinalizedBeforeReelPosition(
          studySessionId,
          firstEditablePosition
        );
        await this.finalizeAttemptsInOrder(studySessionId, attempts);
      }
      await this.aggregateActiveSessionIfEligible(studySessionId);
    });
  }

  private async finalizeAndAggregateCompletedSession(sessionId: string): Promise<void> {
    await this.finalizeAllAttempts(sessionId);
    await this.aggregateCompletedSession(sessionId);
  }

  private async finalizeAllAttempts(studySessionId: string): Promise<void> {
    await this.serializeFinalization(studySessionId, async () => {
      const attempts =
        await this.reviewAttemptRepository.listUnfinalizedBySessionId(studySessionId);
      await this.finalizeAttemptsInOrder(studySessionId, attempts);
    });
  }

  private async finalizeAttemptsInOrder(
    studySessionId: string,
    attempts: readonly FlashcardReviewAttempt[]
  ): Promise<void> {
    const allUnfinalized =
      await this.reviewAttemptRepository.listUnfinalizedBySessionId(studySessionId);
    const remainingIds = new Set(allUnfinalized.map((attempt) => attempt.id));
    const orderedAttempts = orderReviewAttemptsForFinalization(attempts);
    for (const attempt of orderedAttempts) {
      if (this.isBlockedByEarlierReview(attempt, allUnfinalized, remainingIds)) {
        continue;
      }

      // Each transition must observe the memory state committed by the previous review.
      // eslint-disable-next-line no-await-in-loop
      const finalized = await this.finalizeAttemptNow(attempt.id);
      if (finalized) {
        remainingIds.delete(attempt.id);
      }
    }
  }

  private isBlockedByEarlierReview(
    attempt: FlashcardReviewAttempt,
    attempts: readonly FlashcardReviewAttempt[],
    remainingIds: ReadonlySet<string>
  ): boolean {
    if (!isRatedReviewAttempt(attempt)) {
      return false;
    }
    return attempts.some(
      (candidate) =>
        candidate.id !== attempt.id &&
        remainingIds.has(candidate.id) &&
        candidate.flashcardId === attempt.flashcardId &&
        isRatedReviewAttempt(candidate) &&
        compareRatedAttempts(candidate, attempt) < 0
    );
  }

  private async finalizeAttemptNow(attemptId: string): Promise<boolean> {
    const finalizedAt = this.clock.now();
    return this.reviewAttemptFinalizationTransaction.finalizeAttempt(
      attemptId,
      finalizedAt,
      finalizedAt
    );
  }

  private async serializeFinalization(
    studySessionId: string,
    operation: () => Promise<void>
  ): Promise<void> {
    const previous = this.finalizationQueues.get(studySessionId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    this.finalizationQueues.set(studySessionId, next);
    void next.then(
      () => this.clearFinalizationQueue(studySessionId, next),
      () => this.clearFinalizationQueue(studySessionId, next)
    );
    await next;
  }

  private clearFinalizationQueue(studySessionId: string, completed: Promise<void>): void {
    if (this.finalizationQueues.get(studySessionId) === completed) {
      this.finalizationQueues.delete(studySessionId);
    }
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
