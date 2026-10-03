import type { ReviewAttemptCommitTransaction } from "@/features/study/application/review-attempt-commit.transaction";

import { FlashcardProgressServiceImpl } from "@/features/flashcard-progress/application/flashcard-progress.service.impl";
import { SQLiteFlashcardProgressAggregationTransaction } from "@/features/flashcard-progress/infrastructure/sqlite-flashcard-progress-aggregation.transaction";
import { SQLiteFlashcardProgressQuery } from "@/features/flashcard-progress/infrastructure/sqlite-flashcard-progress.query";
import { SQLiteFlashcardProgressRepository } from "@/features/flashcard-progress/infrastructure/sqlite-flashcard-progress.repository";
import { SQLiteLearningProgressResetTransaction } from "@/features/flashcard-progress/infrastructure/sqlite-learning-progress-reset.transaction";
import { FlashcardServiceImpl } from "@/features/flashcards/application/flashcard.service.impl";
import { SQLiteFlashcardAvailabilityQuery } from "@/features/flashcards/infrastructure/sqlite-flashcard-availability.query";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import {
  createFeedComposer,
  createLearningScheduler,
} from "@/features/learning-engine/infrastructure/learning-engine-factories";
import { SQLiteFlashcardMemoryStateRepository } from "@/features/learning-engine/infrastructure/sqlite-flashcard-memory-state.repository";
import { FeedMaterializer } from "@/features/study/application/feed-materializer";
import { StudySessionOperations } from "@/features/study/application/study-session-operations";
import { StudyServiceImpl } from "@/features/study/application/study.service.impl";
import { SQLiteReviewAttemptCommitTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-commit.transaction";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { SQLiteReviewAttemptTransaction } from "@/features/study/infrastructure/sqlite-review-attempt.transaction";
import { SQLiteStudySessionAggregationQuery } from "@/features/study/infrastructure/sqlite-study-session-aggregation.query";
import { SQLiteStudySessionFeedTransaction } from "@/features/study/infrastructure/sqlite-study-session-feed.transaction";
import { SQLiteStudySessionLifecycleTransaction } from "@/features/study/infrastructure/sqlite-study-session-lifecycle.transaction";
import { SQLiteStudySessionMaintenanceTransaction } from "@/features/study/infrastructure/sqlite-study-session-maintenance.transaction";
import { SQLiteStudySessionRecurrenceRepository } from "@/features/study/infrastructure/sqlite-study-session-recurrence.repository";
import { SQLiteStudySessionReelRepository } from "@/features/study/infrastructure/sqlite-study-session-reel.repository";
import { SQLiteStudySessionRepository } from "@/features/study/infrastructure/sqlite-study-session.repository";
import { decks, flashcards } from "@/infrastructure/sqlite/schema";

import type { NodeSqliteDatabase } from "./node-sqlite-database";
import type { SequenceIdGenerator, TestClock } from "./study-fixtures";

export type ScenarioGraph = ReturnType<typeof createScenarioGraph>;

export function createScenarioGraph(
  database: NodeSqliteDatabase,
  clock: TestClock,
  ids: SequenceIdGenerator,
  random: () => number = () => 0,
  commitTransaction?: ReviewAttemptCommitTransaction
) {
  const attempts = new SQLiteReviewAttemptRepository(database.drizzle);
  const sessions = new SQLiteStudySessionRepository(database.drizzle);
  const items = new SQLiteStudySessionReelRepository(database.drizzle);
  const recurrences = new SQLiteStudySessionRecurrenceRepository(database.drizzle);
  const progress = new SQLiteFlashcardProgressRepository(database.drizzle);
  const scheduler = createLearningScheduler();
  const memoryStates = new SQLiteFlashcardMemoryStateRepository(database.drizzle);
  const operations = new StudySessionOperations(
    attempts,
    sessions,
    new SQLiteStudySessionAggregationQuery(database.drizzle),
    clock,
    ids,
    new SQLiteReviewAttemptTransaction(database.drizzle),
    new SQLiteStudySessionLifecycleTransaction(database.drizzle),
    commitTransaction ??
      new SQLiteReviewAttemptCommitTransaction(database.drizzle, scheduler, database.rowIds),
    random,
    new SQLiteFlashcardProgressAggregationTransaction(database.drizzle, database.rowIds),
    new SQLiteStudySessionMaintenanceTransaction(database.drizzle)
  );
  const feedTransaction = new SQLiteStudySessionFeedTransaction(database.drizzle);
  const feed = new FeedMaterializer(
    operations,
    memoryStates,
    scheduler,
    clock,
    createFeedComposer(random),
    sessions,
    items,
    recurrences,
    feedTransaction,
    ids
  );
  const runtime = new StudyServiceImpl({
    operations,
    materializer: feed,
    attempts,
    sessions,
    reels: items,
    recurrences,
    clock,
  });
  // SQLite fixture controls arrange exact positions and interruptions for lower-level invariants.
  const study = Object.assign(operations, {
    updateSessionReelPosition: (id: string, position: number) =>
      sessions.updateCurrentReelPosition(id, position, clock.now()),
    consumeRecurrence: (id: string) => recurrences.markConsumed(id, clock.now()),
    listAttemptsInRange: (id: string, from: number, through: number) =>
      attempts.listBySessionAndReelPositionRange(id, from, through),
    findSession: (id: string) => sessions.findById(id),
    listSessionReels: (id: string) => items.listBySessionId(id),
  });
  return {
    attempts,
    feed,
    runtime,
    feedTransaction,
    clock,
    ids,
    memoryStates,
    items,
    flashcardProgress: new FlashcardProgressServiceImpl(
      new SQLiteFlashcardProgressQuery(database.drizzle, progress),
      clock,
      new SQLiteLearningProgressResetTransaction(database.drizzle, database.rowIds),
      runtime,
      new FlashcardServiceImpl(
        new SQLiteFlashcardRepository(database.drizzle),
        new SQLiteFlashcardAvailabilityQuery(database.drizzle)
      )
    ),
    progress,
    recurrences,
    sessions,
    study,
  };
}

export async function seedDeck(
  database: NodeSqliteDatabase,
  deckId: string,
  cardIds: readonly string[]
): Promise<void> {
  const timestamp = "2026-01-01T00:00:00.000Z";
  await database.drizzle.insert(decks).values({
    authorId: "00000000-0000-4000-8000-000000000001",
    packageSchema: 1,
    revision: 1,

    createdAt: timestamp,
    description: "Scenario fixture",
    id: deckId,
    title: `Deck ${deckId.slice(-4)}`,
    updatedAt: timestamp,
  });
  await database.drizzle.insert(flashcards).values(
    cardIds.map((cardId, order) => ({
      hasAudio: false,
      answer: `Answer ${order}`,
      createdAt: timestamp,
      deckId,
      id: cardId,
      order,
      question: `Question ${order}`,
      updatedAt: timestamp,
    }))
  );
}
