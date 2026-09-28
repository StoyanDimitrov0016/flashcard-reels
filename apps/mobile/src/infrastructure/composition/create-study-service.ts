import type { LearningScheduler } from "@/features/learning-engine/domain/learning-scheduler";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

import { SQLiteFlashcardProgressAggregationTransaction } from "@/features/flashcard-progress/infrastructure/sqlite-flashcard-progress-aggregation-transaction";
import { StudyServiceImpl } from "@/features/study/application/study.service.impl";
import { SQLiteReviewAttemptCommitTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-commit-transaction";
import { SQLiteReviewAttemptTransaction } from "@/features/study/infrastructure/sqlite-review-attempt-transaction";
import { SQLiteReviewAttemptRepository } from "@/features/study/infrastructure/sqlite-review-attempt.repository";
import { SQLiteStudySessionAggregationQuery } from "@/features/study/infrastructure/sqlite-study-session-aggregation.query";
import { SQLiteStudySessionFeedTransaction } from "@/features/study/infrastructure/sqlite-study-session-feed-transaction";
import { SQLiteStudySessionLifecycleTransaction } from "@/features/study/infrastructure/sqlite-study-session-lifecycle-transaction";
import { SQLiteStudySessionMaintenanceTransaction } from "@/features/study/infrastructure/sqlite-study-session-maintenance-transaction";
import { SQLiteStudySessionRecurrenceRepository } from "@/features/study/infrastructure/sqlite-study-session-recurrence.repository";
import { SQLiteStudySessionReelRepository } from "@/features/study/infrastructure/sqlite-study-session-reel.repository";
import { SQLiteStudySessionRepository } from "@/features/study/infrastructure/sqlite-study-session.repository";

type CreateStudyServiceOptions = Readonly<{
  database: DrizzleDatabase;
  clock: Clock;
  idGenerator: IdGenerator;
  learningScheduler: LearningScheduler;
}>;

export function createStudyService({
  database,
  clock,
  idGenerator,
  learningScheduler,
}: CreateStudyServiceOptions) {
  return new StudyServiceImpl(
    new SQLiteReviewAttemptRepository(database),
    new SQLiteStudySessionRepository(database),
    new SQLiteStudySessionAggregationQuery(database),
    new SQLiteStudySessionReelRepository(database),
    new SQLiteStudySessionRecurrenceRepository(database),
    clock,
    idGenerator,
    new SQLiteReviewAttemptTransaction(database),
    new SQLiteStudySessionFeedTransaction(database),
    new SQLiteStudySessionLifecycleTransaction(database),
    new SQLiteReviewAttemptCommitTransaction(database, learningScheduler, idGenerator),
    Math.random,
    new SQLiteFlashcardProgressAggregationTransaction(database, idGenerator),
    new SQLiteStudySessionMaintenanceTransaction(database)
  );
}
