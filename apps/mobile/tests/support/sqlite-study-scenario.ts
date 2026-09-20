import { LearnerProfileServiceImpl } from "@/features/learner-profile/application/learner-profile.service.impl";
import { decks, flashcards } from "@/infrastructure/sqlite/schema";
import { createLearningScheduler } from "@/features/learning-engine/application/learning-engine-factories";
import { SQLiteFlashcardMemoryStateRepository } from "@/features/learning-engine/infrastructure/sqlite-flashcard-memory-state.repository";
import { SQLiteLearnerProfileAggregationTransaction } from "@/features/learner-profile/infrastructure/sqlite-learner-profile-aggregation-transaction";
import { SQLiteLearnerProfileRepository } from "@/features/learner-profile/infrastructure/sqlite-learner-profile.repository";
import { ReelFeedServiceImpl } from "@/features/reels/application/reel-feed.service.impl";
import { StudyServiceImpl } from "@/features/study/application/study.service.impl";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { SQLiteReviewAttemptTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-transaction";
import { SQLiteReviewAttemptFinalizationTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-finalization-transaction";
import { SQLiteStudySessionFeedTransaction } from "@/features/study/infrastructure/sqlite-study-session-feed-transaction";
import { SQLiteStudySessionItemRepository } from "@/features/study/infrastructure/sqlite-study-session-item.repository";
import { SQLiteStudySessionLifecycleTransaction } from "@/features/study/infrastructure/sqlite-study-session-lifecycle-transaction";
import { SQLiteStudySessionMaintenanceTransaction } from "@/features/study/infrastructure/sqlite-study-session-maintenance-transaction";
import { SQLiteStudySessionRecurrenceRepository } from "@/features/study/infrastructure/sqlite-study-session-recurrence.repository";
import { SQLiteStudySessionRepository } from "@/features/study/infrastructure/sqlite-study-session.repository";
import type { ReviewAttemptFinalizationTransaction } from "@/features/study/application/review-attempt-finalization-transaction";
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
  const profiles = new SQLiteLearnerProfileRepository(database.drizzle);
  const scheduler = createLearningScheduler();
  const memoryStates = new SQLiteFlashcardMemoryStateRepository(database.drizzle);
  const study = new StudyServiceImpl(
    attempts,
    sessions,
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
    new SQLiteLearnerProfileAggregationTransaction(database.drizzle),
    new SQLiteStudySessionMaintenanceTransaction(database.drizzle)
  );
  return {
    attempts,
    feed: new ReelFeedServiceImpl(study, memoryStates, scheduler, clock, random),
    memoryStates,
    items,
    learnerProfiles: new LearnerProfileServiceImpl(profiles, clock),
    profiles,
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
