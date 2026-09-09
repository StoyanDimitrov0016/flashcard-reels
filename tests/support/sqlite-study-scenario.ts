import { LearnerProfileServiceImpl } from "@/features/learner-profile/application/learner-profile.service.impl";
import { SQLiteLearnerProfileAggregationTransaction } from "@/features/learner-profile/infrastructure/sqlite-learner-profile-aggregation-transaction";
import { SQLiteLearnerProfileRepository } from "@/features/learner-profile/infrastructure/sqlite-learner-profile.repository";
import { ReelFeedServiceImpl } from "@/features/reels/application/reel-feed.service.impl";
import { StudyServiceImpl } from "@/features/study/application/study.service.impl";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { SQLiteReviewAttemptTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-transaction";
import { SQLiteStudySessionFeedTransaction } from "@/features/study/infrastructure/sqlite-study-session-feed-transaction";
import { SQLiteStudySessionItemRepository } from "@/features/study/infrastructure/sqlite-study-session-item.repository";
import { SQLiteStudySessionLifecycleTransaction } from "@/features/study/infrastructure/sqlite-study-session-lifecycle-transaction";
import { SQLiteStudySessionRecurrenceRepository } from "@/features/study/infrastructure/sqlite-study-session-recurrence.repository";
import { SQLiteStudySessionRepository } from "@/features/study/infrastructure/sqlite-study-session.repository";
import type { NodeSqliteDatabase } from "./node-sqlite-database";
import type { SequenceIdGenerator, TestClock } from "./study-test-support";

export type ScenarioGraph = ReturnType<typeof createScenarioGraph>;

export function createScenarioGraph(
  database: NodeSqliteDatabase,
  clock: TestClock,
  ids: SequenceIdGenerator,
  random: () => number = () => 0
) {
  const attempts = new SQLiteReviewAttemptRepository(database.drizzle);
  const sessions = new SQLiteStudySessionRepository(database.drizzle);
  const items = new SQLiteStudySessionItemRepository(database.drizzle);
  const recurrences = new SQLiteStudySessionRecurrenceRepository(database.drizzle);
  const profiles = new SQLiteLearnerProfileRepository(database.drizzle);
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
    random,
    new SQLiteLearnerProfileAggregationTransaction(database.drizzle),
    profiles
  );
  return {
    attempts,
    feed: new ReelFeedServiceImpl(study, random),
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
  await database.runAsync(
    "INSERT INTO decks (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    deckId,
    `Deck ${deckId.slice(-4)}`,
    "Scenario fixture",
    timestamp,
    timestamp
  );
  await Promise.all(
    cardIds.map((cardId, position) =>
      database.runAsync(
        "INSERT INTO flashcards (id, deck_id, position, question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        cardId,
        deckId,
        position,
        `Question ${position}`,
        `Answer ${position}`,
        timestamp,
        timestamp
      )
    )
  );
}
