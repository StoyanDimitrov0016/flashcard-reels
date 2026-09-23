import type { ReviewAttemptFinalizationTransaction } from "@/features/study/application/review-attempt-finalization-transaction";

import { FlashcardProgressServiceImpl } from "@/features/flashcard-progress/application/flashcard-progress.service.impl";
import { SQLiteFlashcardProgressAggregationTransaction } from "@/features/flashcard-progress/infrastructure/sqlite-flashcard-progress-aggregation-transaction";
import { SQLiteFlashcardProgressQuery } from "@/features/flashcard-progress/infrastructure/sqlite-flashcard-progress.query";
import { SQLiteFlashcardProgressRepository } from "@/features/flashcard-progress/infrastructure/sqlite-flashcard-progress.repository";
import { SQLiteLearningProgressResetTransaction } from "@/features/flashcard-progress/infrastructure/sqlite-learning-progress-reset-transaction";
import { FlashcardServiceImpl } from "@/features/flashcards/application/flashcard.service.impl";
import { SQLiteFlashcardAvailabilityQuery } from "@/features/flashcards/infrastructure/sqlite-flashcard-availability.query";
import { SQLiteFlashcardRepository } from "@/features/flashcards/infrastructure/sqlite-flashcard.repository";
import { createLearningScheduler } from "@/features/learning-engine/application/learning-engine-factories";
import { SQLiteFlashcardMemoryStateRepository } from "@/features/learning-engine/infrastructure/sqlite-flashcard-memory-state.repository";
import { ReelFeedServiceImpl } from "@/features/reels/application/reel-feed.service.impl";
import { StudyServiceImpl } from "@/features/study/application/study.service.impl";
import { SQLiteReviewAttemptFinalizationTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-finalization-transaction";
import { SQLiteReviewAttemptTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-transaction";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { SQLiteStudySessionAggregationQuery } from "@/features/study/infrastructure/sqlite-study-session-aggregation.query";
import { SQLiteStudySessionFeedTransaction } from "@/features/study/infrastructure/sqlite-study-session-feed-transaction";
import { SQLiteStudySessionItemRepository } from "@/features/study/infrastructure/sqlite-study-session-item.repository";
import { SQLiteStudySessionLifecycleTransaction } from "@/features/study/infrastructure/sqlite-study-session-lifecycle-transaction";
import { SQLiteStudySessionMaintenanceTransaction } from "@/features/study/infrastructure/sqlite-study-session-maintenance-transaction";
import { SQLiteStudySessionRecurrenceRepository } from "@/features/study/infrastructure/sqlite-study-session-recurrence.repository";
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
  finalizationTransaction?: ReviewAttemptFinalizationTransaction
) {
  const attempts = new SQLiteReviewAttemptRepository(database.drizzle);
  const sessions = new SQLiteStudySessionRepository(database.drizzle);
  const items = new SQLiteStudySessionItemRepository(database.drizzle);
  const recurrences = new SQLiteStudySessionRecurrenceRepository(database.drizzle);
  const progress = new SQLiteFlashcardProgressRepository(database.drizzle);
  const scheduler = createLearningScheduler();
  const memoryStates = new SQLiteFlashcardMemoryStateRepository(database.drizzle);
  const study = new StudyServiceImpl(
    attempts,
    sessions,
    new SQLiteStudySessionAggregationQuery(database.drizzle),
    items,
    recurrences,
    clock,
    ids,
    new SQLiteReviewAttemptTransaction(database.drizzle),
    new SQLiteStudySessionFeedTransaction(database.drizzle),
    new SQLiteStudySessionLifecycleTransaction(database.drizzle),
    finalizationTransaction ??
      new SQLiteReviewAttemptFinalizationTransaction(database.drizzle, scheduler),
    random,
    new SQLiteFlashcardProgressAggregationTransaction(database.drizzle),
    new SQLiteStudySessionMaintenanceTransaction(database.drizzle)
  );
  return {
    attempts,
    feed: new ReelFeedServiceImpl(study, memoryStates, scheduler, clock, random),
    memoryStates,
    items,
    flashcardProgress: new FlashcardProgressServiceImpl(
      new SQLiteFlashcardProgressQuery(database.drizzle, progress),
      clock,
      new SQLiteLearningProgressResetTransaction(database.drizzle),
      study,
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
    createdAt: timestamp,
    description: "Scenario fixture",
    id: deckId,
    title: `Deck ${deckId.slice(-4)}`,
    updatedAt: timestamp,
  });
  await database.drizzle.insert(flashcards).values(
    cardIds.map((cardId, order) => ({
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
