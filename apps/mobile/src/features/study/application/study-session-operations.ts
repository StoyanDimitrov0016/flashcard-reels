import type { DeckId } from "@/features/decks/domain/deck.model";
import type { FlashcardProgressAggregationTransaction } from "@/features/flashcard-progress/application/flashcard-progress-aggregation-transaction";
import type { ReviewAttemptCommitTransaction } from "@/features/study/application/review-attempt-commit-transaction";
import type { ReviewAttemptTransaction } from "@/features/study/application/review-attempt-transaction";
import type { StudySessionLifecycleTransaction } from "@/features/study/application/study-session-lifecycle-transaction";
import type { StudySessionMaintenanceTransaction } from "@/features/study/application/study-session-maintenance-transaction";
import type { RandomSource } from "@/features/study/domain/recurrences";
import type { ReviewAttemptRepository } from "@/features/study/domain/review-attempt.repository";
import type { StudySessionAggregationQuery } from "@/features/study/domain/study-session-aggregation.query";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

import { type Rating } from "@/features/learning-engine/domain/rating";
import {
  compareRatedAttempts,
  isRatedReviewAttempt,
  orderReviewAttemptsForCommit,
} from "@/features/study/application/review-attempt-commit-order";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import {
  AGGREGATION_CHECK_INTERVAL,
  DETAILED_REVIEW_HISTORY_RETENTION,
  getFirstEditableReelPosition,
  FOREGROUND_AGGREGATION_CHUNK_LIMIT,
  PENDING_COMPLETED_SESSION_RECOVERY_LIMIT,
  PERSISTED_SESSION_FEED_HISTORY_LIMIT,
} from "@/features/study/domain/review-attempts";
import {
  type OpenStudySession,
  type RateAttemptResult,
} from "@/features/study/domain/study.service";
import { OperationError } from "@/shared/errors/operation-error";

export class StudySessionOperations {
  private readonly reviewAttemptRepository: ReviewAttemptRepository;
  private readonly studySessionRepository: StudySessionRepository;
  private readonly studySessionAggregationQuery: StudySessionAggregationQuery;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;
  private readonly random: RandomSource;
  private readonly reviewAttemptTransaction: ReviewAttemptTransaction;
  private readonly reviewAttemptCommitTransaction: ReviewAttemptCommitTransaction;
  private readonly studySessionLifecycleTransaction: StudySessionLifecycleTransaction;
  private readonly flashcardProgressAggregationTransaction: FlashcardProgressAggregationTransaction | null;
  private readonly studySessionMaintenanceTransaction: StudySessionMaintenanceTransaction | null;
  private readonly commitQueues = new Map<string, Promise<void>>();
  private focusedSessionLifecycleQueue: Promise<void> = Promise.resolve();

  constructor(
    reviewAttemptRepository: ReviewAttemptRepository,
    studySessionRepository: StudySessionRepository,
    studySessionAggregationQuery: StudySessionAggregationQuery,
    clock: Clock,
    idGenerator: IdGenerator,
    reviewAttemptTransaction: ReviewAttemptTransaction,
    studySessionLifecycleTransaction: StudySessionLifecycleTransaction,
    reviewAttemptCommitTransaction: ReviewAttemptCommitTransaction,
    random: RandomSource = Math.random,
    flashcardProgressAggregationTransaction: FlashcardProgressAggregationTransaction | null = null,
    studySessionMaintenanceTransaction: StudySessionMaintenanceTransaction | null = null
  ) {
    this.reviewAttemptRepository = reviewAttemptRepository;
    this.studySessionRepository = studySessionRepository;
    this.studySessionAggregationQuery = studySessionAggregationQuery;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.reviewAttemptTransaction = reviewAttemptTransaction;
    this.reviewAttemptCommitTransaction = reviewAttemptCommitTransaction;
    this.studySessionLifecycleTransaction = studySessionLifecycleTransaction;
    this.random = random;
    this.flashcardProgressAggregationTransaction = flashcardProgressAggregationTransaction;
    this.studySessionMaintenanceTransaction = studySessionMaintenanceTransaction;
  }

  async openSession(
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExisting: boolean
  ): Promise<OpenStudySession> {
    if ((scope === "discover" && deckId !== null) || (scope === "focus" && deckId === null)) {
      throw new Error("Study session scope and deck must agree");
    }
    return scope === "focus"
      ? this.serializeFocusedSessionLifecycle(() =>
          this.openSessionDirect(scope, deckId, replaceExisting)
        )
      : this.openSessionDirect(scope, deckId, replaceExisting);
  }

  async resumeFocusedSession(): Promise<StudySession | null> {
    return this.serializeFocusedSessionLifecycle(async () => {
      const activeSession = await this.studySessionRepository.findActiveByScope("focus");
      if (!activeSession || activeSession.deckId === null) {
        return null;
      }
      const resumed = await this.openSessionDirect("focus", activeSession.deckId, false);
      return resumed.session;
    });
  }

  private async openSessionDirect(
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExisting: boolean
  ): Promise<OpenStudySession> {
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
      await this.commitAndAggregateCompletedSession(opened.replacedSessionId);
    }
    await this.aggregateActiveSessionIfEligible(opened.session.id);
    return opened;
  }

  private serializeFocusedSessionLifecycle<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.focusedSessionLifecycleQueue.then(operation, operation);
    this.focusedSessionLifecycleQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  async completeSession(sessionId: string): Promise<void> {
    await this.commitAllAttempts(sessionId);
    await this.studySessionRepository.complete(sessionId, this.clock.now());
    await this.aggregateCompletedSession(sessionId);
  }

  async settleForProgressBackup(): Promise<void> {
    // oxlint-disable no-await-in-loop -- Each session must be committed before its snapshot is read.
    for (const scope of ["discover", "focus"] as const) {
      const active = await this.studySessionRepository.findActiveByScope(scope);
      if (active) {
        await this.completeSession(active.id);
      }
    }
    // oxlint-enable no-await-in-loop
    await this.drainPendingAggregation(() =>
      this.studySessionAggregationQuery.findCompletedSessionsPendingAggregation(
        PENDING_COMPLETED_SESSION_RECOVERY_LIMIT
      )
    );
  }

  async settleActiveSessionsAffectedByDeck(deckId: DeckId, includeFocused: boolean): Promise<void> {
    const sessions = await this.studySessionRepository.listActiveAffectedByDeck(
      deckId,
      includeFocused
    );
    for (const session of sessions) {
      // oxlint-disable-next-line no-await-in-loop -- Each settlement commits and aggregates one session.
      await this.completeSession(session.id);
    }
  }

  async settleBeforeDeckRemoval(deckId: DeckId): Promise<void> {
    await this.settleActiveSessionsAffectedByDeck(deckId, true);
    await this.drainPendingAggregation(() =>
      this.studySessionAggregationQuery.findCompletedSessionsPendingAggregationForDeck(
        deckId,
        PENDING_COMPLETED_SESSION_RECOVERY_LIMIT
      )
    );
  }

  private async drainPendingAggregation(query: () => Promise<StudySession[]>): Promise<void> {
    // oxlint-disable no-await-in-loop -- Each pass advances durable aggregation checkpoints.
    while (true) {
      const pending = await query();
      if (pending.length === 0) {
        return;
      }
      for (const session of pending) {
        await this.commitAndAggregateCompletedSession(session.id);
        const updated = await this.studySessionRepository.findById(session.id);
        if (
          !updated ||
          updated.aggregatedThroughReelPosition <= session.aggregatedThroughReelPosition
        ) {
          throw new Error(`Could not finish flashcard progress aggregation for ${session.id}`);
        }
      }
    }
    // oxlint-enable no-await-in-loop
  }

  async compactSessionRuntimeData(sessionId: string, furthestReelPosition: number): Promise<void> {
    const maintenance = this.studySessionMaintenanceTransaction;
    if (!maintenance) {
      return;
    }
    const minimumRetainedReelPosition = furthestReelPosition - PERSISTED_SESSION_FEED_HISTORY_LIMIT;
    if (minimumRetainedReelPosition > 0) {
      await maintenance.compact(sessionId, minimumRetainedReelPosition);
    }
  }

  async recoverPendingCompletedSessionAggregation(
    limit = PENDING_COMPLETED_SESSION_RECOVERY_LIMIT
  ): Promise<void> {
    if (!this.flashcardProgressAggregationTransaction) {
      return;
    }
    const pending =
      await this.studySessionAggregationQuery.findCompletedSessionsPendingAggregation(limit);
    const recoverNext = async (index: number): Promise<void> => {
      const session = pending[index];
      if (!session) {
        return;
      }
      await this.commitAndAggregateCompletedSession(session.id);
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

    const unfinished = await this.reviewAttemptRepository.listUncommittedBeforeReelPosition(
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

  async startAttempt(
    flashcardId: string,
    reelPosition: number,
    studySessionId: string
  ): Promise<string> {
    const session = await this.studySessionRepository.findById(studySessionId);
    if (!session || session.completedAt !== null) {
      throw new OperationError({
        code: "STUDY_SESSION_ENDED",
        context: { studySessionId },
        message: `Cannot start a review attempt for inactive session ${studySessionId}`,
      });
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
      committedAt: null,
      id: this.idGenerator.generate(),
      reelPosition,
      rating: null,
      ratedAt: null,
      studySessionId,
      updatedAt: createdAt,
    });
    await this.reviewAttemptTransaction.createAttempt(attempt);
    return attempt.id;
  }

  async rateAttempt(attemptId: string, rating: Rating): Promise<RateAttemptResult> {
    const attempt = await this.reviewAttemptRepository.findById(attemptId);
    if (!attempt) {
      return { status: "missing" };
    }
    if (attempt.committedAt !== null) {
      return { status: "locked", rating: attempt.rating };
    }
    const updated = await this.reviewAttemptTransaction.rateAttempt(
      attemptId,
      rating,
      this.clock.now()
    );
    if (updated) {
      return { status: "rated" };
    }
    const saved = await this.reviewAttemptRepository.findById(attemptId);
    return saved ? { status: "locked", rating: saved.rating } : { status: "missing" };
  }

  async commitAttempt(attemptId: string): Promise<void> {
    const attempt = await this.reviewAttemptRepository.findById(attemptId);
    if (!attempt) {
      return;
    }
    await this.serializeSession(attempt.studySessionId, async () => {
      const currentAttempt = await this.reviewAttemptRepository.findById(attemptId);
      if (!currentAttempt || currentAttempt.committedAt !== null) {
        return;
      }
      const allUncommitted = await this.reviewAttemptRepository.listUncommittedBySessionId(
        currentAttempt.studySessionId
      );
      const remainingIds = new Set(allUncommitted.map((candidate) => candidate.id));
      if (this.isBlockedByEarlierReview(currentAttempt, allUncommitted, remainingIds)) {
        return;
      }
      await this.commitAttemptNow(currentAttempt.id);
    });
  }

  async commitAttemptsOutsideEditableWindow(studySessionId: string): Promise<void> {
    await this.serializeSession(studySessionId, () => this.commitOutsideWindow(studySessionId));
  }

  async commitOutsideWindow(studySessionId: string): Promise<void> {
    const session = await this.studySessionRepository.findById(studySessionId);
    if (!session) {
      return;
    }
    const firstEditablePosition = getFirstEditableReelPosition(session.furthestReelPosition);
    if (firstEditablePosition > 0) {
      const attempts = await this.reviewAttemptRepository.listUncommittedBeforeReelPosition(
        studySessionId,
        firstEditablePosition
      );
      await this.commitAttemptsInOrder(studySessionId, attempts);
    }
    await this.aggregateActiveSessionIfEligible(studySessionId);
  }

  private async commitAndAggregateCompletedSession(sessionId: string): Promise<void> {
    await this.commitAllAttempts(sessionId);
    await this.aggregateCompletedSession(sessionId);
  }

  private async commitAllAttempts(studySessionId: string): Promise<void> {
    await this.serializeSession(studySessionId, async () => {
      const attempts =
        await this.reviewAttemptRepository.listUncommittedBySessionId(studySessionId);
      await this.commitAttemptsInOrder(studySessionId, attempts);
    });
  }

  private async commitAttemptsInOrder(
    studySessionId: string,
    attempts: readonly FlashcardReviewAttempt[]
  ): Promise<void> {
    const allUncommitted =
      await this.reviewAttemptRepository.listUncommittedBySessionId(studySessionId);
    const remainingIds = new Set(allUncommitted.map((attempt) => attempt.id));
    const orderedAttempts = orderReviewAttemptsForCommit(attempts);
    for (const attempt of orderedAttempts) {
      if (this.isBlockedByEarlierReview(attempt, allUncommitted, remainingIds)) {
        continue;
      }

      // oxlint-disable-next-line no-await-in-loop -- Each transition must observe the state committed by the previous review.
      const committed = await this.commitAttemptNow(attempt.id);
      if (committed) {
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

  private async commitAttemptNow(attemptId: string): Promise<boolean> {
    const committedAt = this.clock.now();
    return this.reviewAttemptCommitTransaction.commitAttempt(
      attemptId,
      committedAt,
      committedAt,
      this.random
    );
  }

  async serializeSession<T>(studySessionId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.commitQueues.get(studySessionId) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    const next = result.then(
      () => undefined,
      () => undefined
    );
    this.commitQueues.set(studySessionId, next);
    void next.then(() => this.clearCommitQueue(studySessionId, next));
    return result;
  }

  private clearCommitQueue(studySessionId: string, completed: Promise<void>): void {
    if (this.commitQueues.get(studySessionId) === completed) {
      this.commitQueues.delete(studySessionId);
    }
  }

  private async aggregateActiveSessionIfEligible(studySessionId: string): Promise<void> {
    if (!this.flashcardProgressAggregationTransaction) {
      return;
    }
    const eligibility = await this.getAggregationEligibility(studySessionId);
    if (!eligibility?.shouldCheck) {
      return;
    }
    await this.flashcardProgressAggregationTransaction.aggregate(
      studySessionId,
      eligibility.safeThroughReelPosition,
      this.clock.now()
    );
  }

  private async aggregateCompletedSession(studySessionId: string): Promise<void> {
    const aggregation = this.flashcardProgressAggregationTransaction;
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
