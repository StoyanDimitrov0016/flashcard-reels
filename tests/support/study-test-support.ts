import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import { findNextFreeRecurrenceSlot } from "@/features/study/config/recurrences";
import { FOCUS_SESSION_INACTIVITY_TIMEOUT_MS } from "@/features/study/config/review-attempts";
import type { ReviewAttemptRepository } from "@/features/study/domain/review-attempt.repository";
import type { ReviewAttemptTransaction } from "@/features/study/services/review-attempt-transaction";
import type { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudySessionItemRepository } from "@/features/study/domain/study-session-item.repository";
import { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionRecurrenceRepository } from "@/features/study/domain/study-session-recurrence.repository";
import { StudySession } from "@/features/study/domain/study-session.model";
import type { StudySessionStrategy } from "@/features/study/domain/study-session-strategy";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";
import type { StudySessionFeedTransaction } from "@/features/study/services/study-session-feed-transaction";
import type {
  OpenStudySessionResult,
  StudySessionLifecycleTransaction,
} from "@/features/study/services/study-session-lifecycle-transaction";
import { StudyService } from "@/features/study/services/study.service";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";
import { Flashcard } from "@/features/flashcards/domain/flashcard.model";

export const TEST_DECK_ID = "00000000-0000-4000-8000-000000000100";
export const OTHER_DECK_ID = "00000000-0000-4000-8000-000000000101";

export function testId(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

export function makeFlashcard(
  index: number,
  deckId: string = TEST_DECK_ID,
  deckPosition = index - 1
): Flashcard {
  return new Flashcard({
    answer: `Answer ${index}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    deckId,
    deckPosition,
    id: testId(index),
    question: `Question ${index}`,
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
}

export function makeSession(
  id: string,
  scope: "mixed" | "focused",
  deckId: string | null = scope === "focused" ? TEST_DECK_ID : null,
  currentReelPosition = 0,
  strategy: StudySessionStrategy = "shuffle"
): StudySession {
  return new StudySession({
    completedAt: null,
    aggregatedThroughReelPosition: -1,
    createdAt: "2026-01-01T00:00:00.000Z",
    currentReelPosition,
    deckId,
    id,
    lastActiveAt: "2026-01-01T00:00:00.000Z",
    scope,
    strategyState: "{}",
    strategy,
  });
}

export class TestClock implements Clock {
  private currentTime = Date.parse("2026-01-01T00:00:00.000Z");

  now(): string {
    this.currentTime += 1000;
    return new Date(this.currentTime).toISOString();
  }

  advance(milliseconds: number): void {
    this.currentTime += milliseconds;
  }
}

export class SequenceIdGenerator implements IdGenerator {
  private nextId = 1000;

  generate(): string {
    const id = testId(this.nextId);
    this.nextId += 1;
    return id;
  }
}

export class InMemoryReviewAttemptRepository implements ReviewAttemptRepository {
  private readonly attempts = new Map<string, FlashcardReviewAttempt>();

  async create(attempt: FlashcardReviewAttempt): Promise<void> {
    if (
      this.attempts.has(attempt.id) ||
      [...this.attempts.values()].some(
        (current) =>
          current.studySessionId === attempt.studySessionId &&
          current.reelPosition === attempt.reelPosition
      )
    ) {
      throw new Error(`Duplicate attempt ${attempt.id}`);
    }
    this.attempts.set(attempt.id, attempt);
  }

  async applyRating(attemptId: string, rating: RecallLevel, updatedAt: string): Promise<boolean> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt || attempt.finalizedAt !== null) {
      return false;
    }
    this.attempts.set(
      attemptId,
      new FlashcardReviewAttempt({
        createdAt: attempt.createdAt,
        finalizedAt: attempt.finalizedAt,
        flashcardId: attempt.flashcardId,
        id: attempt.id,
        rating,
        ratedAt: updatedAt,
        reelPosition: attempt.reelPosition,
        studySessionId: attempt.studySessionId,
        updatedAt,
      })
    );
    return true;
  }

  async finalize(attemptId: string, finalizedAt: string, updatedAt: string): Promise<void> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt || attempt.finalizedAt !== null) {
      return;
    }
    this.attempts.set(
      attemptId,
      new FlashcardReviewAttempt({
        createdAt: attempt.createdAt,
        finalizedAt,
        flashcardId: attempt.flashcardId,
        id: attempt.id,
        rating: attempt.rating,
        ratedAt: attempt.ratedAt,
        reelPosition: attempt.reelPosition,
        studySessionId: attempt.studySessionId,
        updatedAt,
      })
    );
  }

  async findById(attemptId: string): Promise<FlashcardReviewAttempt | null> {
    return this.attempts.get(attemptId) ?? null;
  }

  async findBySessionAndReelPosition(
    studySessionId: string,
    reelPosition: number
  ): Promise<FlashcardReviewAttempt | null> {
    return (
      [...this.attempts.values()].find(
        (attempt) =>
          attempt.studySessionId === studySessionId && attempt.reelPosition === reelPosition
      ) ?? null
    );
  }

  async listBySessionAndReelPositionRange(
    studySessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<FlashcardReviewAttempt[]> {
    return ordered(
      [...this.attempts.values()].filter(
        (attempt) =>
          attempt.studySessionId === studySessionId &&
          attempt.reelPosition >= fromReelPosition &&
          attempt.reelPosition <= throughReelPosition
      ),
      (left, right) => left.reelPosition - right.reelPosition
    );
  }

  async findMaxReelPosition(studySessionId: string): Promise<number | null> {
    const positions = [...this.attempts.values()]
      .filter((attempt) => attempt.studySessionId === studySessionId)
      .map((attempt) => attempt.reelPosition);
    return positions.length > 0 ? Math.max(...positions) : null;
  }

  async listUnfinalizedBeforeReelPosition(
    studySessionId: string,
    reelPosition: number
  ): Promise<FlashcardReviewAttempt[]> {
    return ordered(
      [...this.attempts.values()].filter(
        (attempt) =>
          attempt.studySessionId === studySessionId &&
          attempt.finalizedAt === null &&
          attempt.reelPosition < reelPosition
      ),
      (left, right) => left.reelPosition - right.reelPosition
    );
  }

  all(): FlashcardReviewAttempt[] {
    return [...this.attempts.values()];
  }

  restore(attempts: readonly FlashcardReviewAttempt[]): void {
    this.attempts.clear();
    for (const attempt of attempts) {
      this.attempts.set(attempt.id, attempt);
    }
  }
}

export class InMemoryStudySessionRepository implements StudySessionRepository {
  private readonly sessions = new Map<string, StudySession>();

  async complete(sessionId: string, completedAt: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session && session.completedAt === null) {
      this.sessions.set(
        sessionId,
        new StudySession({
          completedAt,
          aggregatedThroughReelPosition: session.aggregatedThroughReelPosition,
          createdAt: session.createdAt,
          currentReelPosition: session.currentReelPosition,
          deckId: session.deckId,
          id: session.id,
          lastActiveAt: session.lastActiveAt,
          scope: session.scope,
          strategyState: session.strategyState,
          strategy: session.strategy,
        })
      );
    }
  }

  async create(session: StudySession): Promise<void> {
    if (this.sessions.has(session.id)) {
      throw new Error(`Duplicate session ${session.id}`);
    }
    this.sessions.set(session.id, session);
  }

  async findById(sessionId: string): Promise<StudySession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async findActive(
    scope: "mixed" | "focused",
    deckId: string | null
  ): Promise<StudySession | null> {
    return (
      ordered(
        [...this.sessions.values()].filter(
          (session) =>
            session.scope === scope && session.deckId === deckId && session.completedAt === null
        ),
        (left, right) => right.createdAt.localeCompare(left.createdAt)
      )[0] ?? null
    );
  }

  async findActiveByScope(scope: "mixed" | "focused"): Promise<StudySession | null> {
    return (
      ordered(
        [...this.sessions.values()].filter(
          (session) => session.scope === scope && session.completedAt === null
        ),
        (left, right) => right.createdAt.localeCompare(left.createdAt)
      )[0] ?? null
    );
  }

  async updateCurrentReelPosition(
    sessionId: string,
    currentReelPosition: number,
    lastActiveAt: string
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || session.completedAt !== null) {
      return false;
    }
    this.sessions.set(
      sessionId,
      new StudySession({
        completedAt: session.completedAt,
        aggregatedThroughReelPosition: session.aggregatedThroughReelPosition,
        createdAt: session.createdAt,
        currentReelPosition,
        deckId: session.deckId,
        id: session.id,
        lastActiveAt,
        scope: session.scope,
        strategyState: session.strategyState,
        strategy: session.strategy,
      })
    );
    return true;
  }

  async setStrategyState(sessionId: string, strategyState: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || session.completedAt !== null) {
      return false;
    }
    this.sessions.set(
      sessionId,
      new StudySession({
        completedAt: session.completedAt,
        aggregatedThroughReelPosition: session.aggregatedThroughReelPosition,
        createdAt: session.createdAt,
        currentReelPosition: session.currentReelPosition,
        deckId: session.deckId,
        id: session.id,
        lastActiveAt: session.lastActiveAt,
        scope: session.scope,
        strategyState,
        strategy: session.strategy,
      })
    );
    return true;
  }

  all(): StudySession[] {
    return [...this.sessions.values()];
  }
}

export class InMemoryStudySessionLifecycleTransaction implements StudySessionLifecycleTransaction {
  private readonly sessions: InMemoryStudySessionRepository;

  constructor(sessions: InMemoryStudySessionRepository) {
    this.sessions = sessions;
  }

  async open(
    scope: "mixed" | "focused",
    deckId: string | null,
    replaceExisting: boolean,
    strategy: StudySessionStrategy,
    now: string,
    sessionId: string
  ): Promise<OpenStudySessionResult> {
    const activeSession = await this.sessions.findActiveByScope(scope);
    const focusExpired =
      activeSession &&
      scope === "focused" &&
      Date.parse(now) - Date.parse(activeSession.lastActiveAt) >=
        FOCUS_SESSION_INACTIVITY_TIMEOUT_MS;
    const shouldReplace =
      activeSession &&
      (replaceExisting ||
        (scope === "focused" &&
          (activeSession.deckId !== deckId ||
            activeSession.strategy !== strategy ||
            focusExpired)));

    if (activeSession && !shouldReplace) {
      await this.sessions.updateCurrentReelPosition(
        activeSession.id,
        activeSession.currentReelPosition,
        now
      );
      return {
        created: false,
        replacedSessionId: null,
        session: new StudySession({
          completedAt: activeSession.completedAt,
          aggregatedThroughReelPosition: activeSession.aggregatedThroughReelPosition,
          createdAt: activeSession.createdAt,
          currentReelPosition: activeSession.currentReelPosition,
          deckId: activeSession.deckId,
          id: activeSession.id,
          lastActiveAt: now,
          scope: activeSession.scope,
          strategy: activeSession.strategy,
          strategyState: activeSession.strategyState,
        }),
      };
    }
    if (activeSession) {
      await this.sessions.complete(activeSession.id, now);
    }
    const session = new StudySession({
      completedAt: null,
      aggregatedThroughReelPosition: -1,
      createdAt: now,
      currentReelPosition: 0,
      deckId,
      id: sessionId,
      lastActiveAt: now,
      scope,
      strategy,
      strategyState: "{}",
    });
    await this.sessions.create(session);
    return { created: true, replacedSessionId: activeSession?.id ?? null, session };
  }
}

export class InMemoryStudySessionItemRepository implements StudySessionItemRepository {
  private readonly items = new Map<string, StudySessionItem>();

  async createMany(items: readonly StudySessionItem[]): Promise<void> {
    const keys = new Set<string>();
    for (const item of items) {
      const key = `${item.studySessionId}:base-${item.baseFeedPosition}`;
      const reelKey = `${item.studySessionId}:reel-${item.reelPosition}`;
      if (
        keys.has(key) ||
        keys.has(reelKey) ||
        [...this.items.values()].some(
          (current) =>
            `${current.studySessionId}:${current.baseFeedPosition}` === key ||
            `${current.studySessionId}:${current.reelPosition}` === reelKey
        )
      ) {
        throw new Error(`Duplicate base feed position ${key}`);
      }
      keys.add(key);
      keys.add(reelKey);
    }
    for (const item of items) {
      this.items.set(item.id, item);
    }
  }

  async listBySessionId(studySessionId: string): Promise<StudySessionItem[]> {
    return ordered(
      [...this.items.values()].filter((item) => item.studySessionId === studySessionId),
      (left, right) => left.reelPosition - right.reelPosition
    );
  }

  async findMaxBaseFeedPosition(studySessionId: string): Promise<number | null> {
    const positions = [...this.items.values()]
      .filter((item) => item.studySessionId === studySessionId)
      .map((item) => item.baseFeedPosition);
    return positions.length > 0 ? Math.max(...positions) : null;
  }

  async findMaxReelPosition(studySessionId: string): Promise<number | null> {
    const positions = [...this.items.values()]
      .filter((item) => item.studySessionId === studySessionId)
      .map((item) => item.reelPosition);
    return positions.length > 0 ? Math.max(...positions) : null;
  }

  async listBySessionIdInReelPositionRange(
    studySessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<StudySessionItem[]> {
    return ordered(
      [...this.items.values()].filter(
        (item) =>
          item.studySessionId === studySessionId &&
          item.reelPosition >= fromReelPosition &&
          item.reelPosition <= throughReelPosition
      ),
      (left, right) => left.reelPosition - right.reelPosition
    );
  }

  all(): StudySessionItem[] {
    return [...this.items.values()];
  }

  restore(items: readonly StudySessionItem[]): void {
    this.items.clear();
    for (const item of items) {
      this.items.set(item.id, item);
    }
  }
}

export class InMemoryStudySessionFeedTransaction implements StudySessionFeedTransaction {
  private readonly items: InMemoryStudySessionItemRepository;
  private readonly sessions: InMemoryStudySessionRepository;

  constructor(items: InMemoryStudySessionItemRepository, sessions: InMemoryStudySessionRepository) {
    this.items = items;
    this.sessions = sessions;
  }

  async append(
    sessionId: string,
    items: readonly StudySessionItem[],
    strategyState: string
  ): Promise<void> {
    const itemSnapshot = this.items.all();
    const session = await this.sessions.findById(sessionId);
    try {
      await this.items.createMany(items);
      const updated = await this.sessions.setStrategyState(sessionId, strategyState);
      if (!updated) {
        throw new Error(`Could not update study session ${sessionId}`);
      }
    } catch (error) {
      this.items.restore(itemSnapshot);
      if (session) {
        await this.sessions.setStrategyState(sessionId, session.strategyState);
      }
      throw error;
    }
  }
}

export class InMemoryStudySessionRecurrenceRepository implements StudySessionRecurrenceRepository {
  private readonly recurrences = new Map<string, StudySessionRecurrence>();

  async cancelPendingBySourceAttemptId(sourceAttemptId: string): Promise<void> {
    for (const [id, recurrence] of this.recurrences) {
      if (recurrence.sourceAttemptId === sourceAttemptId && recurrence.consumedAt === null) {
        this.recurrences.delete(id);
      }
    }
  }

  async create(recurrence: StudySessionRecurrence): Promise<void> {
    this.assertPendingConstraints(recurrence);
    this.recurrences.set(recurrence.id, recurrence);
  }

  async listBySessionId(studySessionId: string): Promise<StudySessionRecurrence[]> {
    return ordered(
      [...this.recurrences.values()].filter(
        (recurrence) => recurrence.studySessionId === studySessionId
      ),
      (left, right) =>
        left.targetReelPosition - right.targetReelPosition || left.id.localeCompare(right.id)
    );
  }

  async listPendingFlashcardIdsFromTargetPosition(
    studySessionId: string,
    fromTargetReelPosition: number
  ): Promise<string[]> {
    return (await this.listBySessionId(studySessionId))
      .filter(
        (recurrence) =>
          recurrence.consumedAt === null && recurrence.targetReelPosition > fromTargetReelPosition
      )
      .map((recurrence) => recurrence.flashcardId);
  }

  async listBySessionIdInTargetRange(
    studySessionId: string,
    fromTargetReelPosition: number,
    throughTargetReelPosition: number
  ): Promise<StudySessionRecurrence[]> {
    return ordered(
      [...this.recurrences.values()].filter(
        (recurrence) =>
          recurrence.studySessionId === studySessionId &&
          recurrence.targetReelPosition >= fromTargetReelPosition &&
          recurrence.targetReelPosition <= throughTargetReelPosition
      ),
      (left, right) =>
        left.targetReelPosition - right.targetReelPosition || left.id.localeCompare(right.id)
    );
  }

  async markConsumed(recurrenceId: string, consumedAt: string): Promise<boolean> {
    const recurrence = this.recurrences.get(recurrenceId);
    if (!recurrence || recurrence.consumedAt !== null) {
      return false;
    }
    this.recurrences.set(
      recurrenceId,
      new StudySessionRecurrence({
        consumedAt,
        createdAt: recurrence.createdAt,
        flashcardId: recurrence.flashcardId,
        id: recurrence.id,
        sourceAttemptId: recurrence.sourceAttemptId,
        studySessionId: recurrence.studySessionId,
        targetReelPosition: recurrence.targetReelPosition,
      })
    );
    return true;
  }

  async schedulePending(
    recurrence: StudySessionRecurrence,
    proposedTargetReelPosition: number
  ): Promise<StudySessionRecurrence> {
    const existing = [...this.recurrences.values()].find(
      (current) =>
        current.sourceAttemptId === recurrence.sourceAttemptId && current.consumedAt === null
    );
    const occupiedReelPositions = new Set(
      (await this.listBySessionId(recurrence.studySessionId))
        .filter((current) => current.consumedAt === null && current.id !== existing?.id)
        .map((current) => current.targetReelPosition)
    );
    const targetReelPosition = findNextFreeRecurrenceSlot(
      proposedTargetReelPosition,
      occupiedReelPositions
    );
    if (existing) {
      const updated = new StudySessionRecurrence({
        consumedAt: existing.consumedAt,
        createdAt: existing.createdAt,
        flashcardId: existing.flashcardId,
        id: existing.id,
        sourceAttemptId: existing.sourceAttemptId,
        studySessionId: existing.studySessionId,
        targetReelPosition,
      });
      this.assertPendingConstraints(updated, existing.id);
      this.recurrences.set(existing.id, updated);
      return updated;
    }
    const scheduled = new StudySessionRecurrence({
      consumedAt: recurrence.consumedAt,
      createdAt: recurrence.createdAt,
      flashcardId: recurrence.flashcardId,
      id: recurrence.id,
      sourceAttemptId: recurrence.sourceAttemptId,
      studySessionId: recurrence.studySessionId,
      targetReelPosition,
    });
    await this.create(scheduled);
    return scheduled;
  }

  all(): StudySessionRecurrence[] {
    return [...this.recurrences.values()];
  }

  restore(recurrences: readonly StudySessionRecurrence[]): void {
    this.recurrences.clear();
    for (const recurrence of recurrences) {
      this.recurrences.set(recurrence.id, recurrence);
    }
  }

  private assertPendingConstraints(
    recurrence: StudySessionRecurrence,
    replacingId: string | null = null
  ): void {
    if (recurrence.consumedAt !== null) {
      return;
    }
    for (const current of this.recurrences.values()) {
      if (current.id === replacingId || current.consumedAt !== null) {
        continue;
      }
      if (current.sourceAttemptId === recurrence.sourceAttemptId) {
        throw new Error("Duplicate pending source attempt");
      }
      if (
        current.studySessionId === recurrence.studySessionId &&
        current.targetReelPosition === recurrence.targetReelPosition
      ) {
        throw new Error("Duplicate pending target reel position");
      }
    }
  }
}

export class InMemoryReviewAttemptTransaction implements ReviewAttemptTransaction {
  private readonly attempts: InMemoryReviewAttemptRepository;
  private readonly recurrences: InMemoryStudySessionRecurrenceRepository;

  constructor(
    attempts: InMemoryReviewAttemptRepository,
    recurrences: InMemoryStudySessionRecurrenceRepository
  ) {
    this.attempts = attempts;
    this.recurrences = recurrences;
  }

  async rateAttempt(
    attemptId: string,
    rating: RecallLevel,
    updatedAt: string,
    recurrence: StudySessionRecurrence | null,
    proposedTargetReelPosition: number | null
  ): Promise<boolean> {
    const attemptsSnapshot = this.attempts.all();
    const recurrencesSnapshot = this.recurrences.all();
    try {
      const updated = await this.attempts.applyRating(attemptId, rating, updatedAt);
      if (!updated) {
        return false;
      }
      if (recurrence === null || proposedTargetReelPosition === null) {
        await this.recurrences.cancelPendingBySourceAttemptId(attemptId);
      } else {
        await this.recurrences.schedulePending(recurrence, proposedTargetReelPosition);
      }
      return true;
    } catch (error) {
      this.attempts.restore(attemptsSnapshot);
      this.recurrences.restore(recurrencesSnapshot);
      throw error;
    }
  }
}

function ordered<T>(items: readonly T[], compare: (left: T, right: T) => number): T[] {
  const result: T[] = [];
  for (const item of items) {
    const index = result.findIndex((current) => compare(item, current) < 0);
    if (index < 0) {
      result.push(item);
    } else {
      result.splice(index, 0, item);
    }
  }
  return result;
}

export type StudyHarness = Readonly<{
  attempts: InMemoryReviewAttemptRepository;
  clock: TestClock;
  items: InMemoryStudySessionItemRepository;
  recurrences: InMemoryStudySessionRecurrenceRepository;
  service: StudyService;
  sessions: InMemoryStudySessionRepository;
}>;

export function createStudyHarness(random: () => number = () => 0): StudyHarness {
  const attempts = new InMemoryReviewAttemptRepository();
  const sessions = new InMemoryStudySessionRepository();
  const items = new InMemoryStudySessionItemRepository();
  const recurrences = new InMemoryStudySessionRecurrenceRepository();
  const clock = new TestClock();
  const transaction = new InMemoryReviewAttemptTransaction(attempts, recurrences);
  const feedTransaction = new InMemoryStudySessionFeedTransaction(items, sessions);
  const lifecycleTransaction = new InMemoryStudySessionLifecycleTransaction(sessions);
  const service = new StudyService(
    attempts,
    sessions,
    items,
    recurrences,
    clock,
    new SequenceIdGenerator(),
    transaction,
    feedTransaction,
    lifecycleTransaction,
    random
  );
  return { attempts, clock, items, recurrences, service, sessions };
}
