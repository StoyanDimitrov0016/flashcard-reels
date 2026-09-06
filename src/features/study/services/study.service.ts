import { type RecallLevel } from "@/features/study/domain/recall-level";
import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import {
  EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE,
  FOCUS_SESSION_INACTIVITY_TIMEOUT_MS,
} from "@/features/study/config/review-attempts";
import { calculateRecurrenceTarget, type RandomSource } from "@/features/study/config/recurrences";
import type { ReviewAttemptRepository } from "@/features/study/domain/review-attempt.repository";
import type { ReviewAttemptTransaction } from "@/features/study/services/review-attempt-transaction";
import { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudySessionItemRepository } from "@/features/study/domain/study-session-item.repository";
import { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionRecurrenceRepository } from "@/features/study/domain/study-session-recurrence.repository";
import { StudySession, type StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionStrategy } from "@/features/study/domain/study-session-strategy";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";
import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

export type OpenStudySession = Readonly<{
  created: boolean;
  session: StudySession;
}>;

export class StudyService {
  private readonly reviewAttemptRepository: ReviewAttemptRepository;
  private readonly studySessionRecurrenceRepository: StudySessionRecurrenceRepository;
  private readonly studySessionRepository: StudySessionRepository;
  private readonly studySessionItemRepository: StudySessionItemRepository;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;
  private readonly random: RandomSource;
  private readonly reviewAttemptTransaction: ReviewAttemptTransaction;

  constructor(
    reviewAttemptRepository: ReviewAttemptRepository,
    studySessionRepository: StudySessionRepository,
    studySessionItemRepository: StudySessionItemRepository,
    studySessionRecurrenceRepository: StudySessionRecurrenceRepository,
    clock: Clock,
    idGenerator: IdGenerator,
    reviewAttemptTransaction: ReviewAttemptTransaction,
    random: RandomSource = Math.random
  ) {
    this.reviewAttemptRepository = reviewAttemptRepository;
    this.studySessionRecurrenceRepository = studySessionRecurrenceRepository;
    this.studySessionRepository = studySessionRepository;
    this.studySessionItemRepository = studySessionItemRepository;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.reviewAttemptTransaction = reviewAttemptTransaction;
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
    const activeSession = await this.studySessionRepository.findActiveByScope(scope);
    if (activeSession) {
      const focusExpired =
        scope === "focused" &&
        Date.parse(createdAt) - Date.parse(activeSession.lastActiveAt) >=
          FOCUS_SESSION_INACTIVITY_TIMEOUT_MS;
      const shouldReplace =
        replaceExisting ||
        (scope === "focused" &&
          (activeSession.deckId !== deckId || activeSession.strategy !== strategy || focusExpired));
      if (!shouldReplace) {
        await this.studySessionRepository.updateCurrentReelPosition(
          activeSession.id,
          activeSession.currentReelPosition,
          createdAt
        );
        return {
          created: false,
          session: new StudySession({
            completedAt: activeSession.completedAt,
            createdAt: activeSession.createdAt,
            currentReelPosition: activeSession.currentReelPosition,
            deckId: activeSession.deckId,
            id: activeSession.id,
            lastActiveAt: createdAt,
            scope: activeSession.scope,
            strategyState: activeSession.strategyState,
            strategy: activeSession.strategy,
          }),
        };
      }
      await this.studySessionRepository.complete(activeSession.id, createdAt);
    }

    const session = new StudySession({
      completedAt: null,
      createdAt,
      currentReelPosition: 0,
      deckId,
      id: this.idGenerator.generate(),
      lastActiveAt: createdAt,
      scope,
      strategyState: "{}",
      strategy,
    });
    await this.studySessionRepository.create(session);
    return { created: true, session };
  }

  async completeSession(sessionId: string): Promise<void> {
    await this.studySessionRepository.complete(sessionId, this.clock.now());
  }

  async findSession(sessionId: string): Promise<StudySession | null> {
    return this.studySessionRepository.findById(sessionId);
  }

  async updateStrategyState(sessionId: string, strategyState: string): Promise<boolean> {
    return this.studySessionRepository.updateStrategyState(sessionId, strategyState);
  }

  async createSessionItems(
    sessionId: string,
    cards: readonly Flashcard[],
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
    await this.studySessionItemRepository.createMany(items);
  }

  async listSessionItems(sessionId: string): Promise<StudySessionItem[]> {
    return this.studySessionItemRepository.listBySessionId(sessionId);
  }

  async listSessionRecurrences(sessionId: string): Promise<StudySessionRecurrence[]> {
    return this.studySessionRecurrenceRepository.listBySessionId(sessionId);
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
