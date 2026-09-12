import { and, eq, isNotNull, lt } from "drizzle-orm";

import type { StudySessionMaintenanceTransaction } from "@/features/study/application/study-session-maintenance-transaction";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { studySessionItems, studySessionRecurrences } from "@/infrastructure/sqlite/schema";

export class SQLiteStudySessionMaintenanceTransaction<
  TRunResult = unknown,
> implements StudySessionMaintenanceTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async compact(sessionId: string, minimumRetainedReelPosition: number): Promise<void> {
    this.database.transaction((transaction) => {
      transaction
        .delete(studySessionItems)
        .where(
          and(
            eq(studySessionItems.studySessionId, sessionId),
            lt(studySessionItems.reelPosition, minimumRetainedReelPosition)
          )
        )
        .run();
      transaction
        .delete(studySessionRecurrences)
        .where(
          and(
            eq(studySessionRecurrences.studySessionId, sessionId),
            lt(studySessionRecurrences.targetReelPosition, minimumRetainedReelPosition),
            isNotNull(studySessionRecurrences.consumedAt)
          )
        )
        .run();
    });
  }
}
