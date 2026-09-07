import { and, eq, isNull } from "drizzle-orm";

import type { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudySessionFeedTransaction } from "@/features/study/application/study-session-feed-transaction";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { studySessionItems, studySessions } from "@/infrastructure/sqlite/schema";

export class SQLiteStudySessionFeedTransaction<
  TRunResult = unknown,
> implements StudySessionFeedTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async append(
    sessionId: string,
    items: readonly StudySessionItem[],
    strategyState: string
  ): Promise<void> {
    this.database.transaction((transaction) => {
      if (items.length > 0) {
        transaction
          .insert(studySessionItems)
          .values(
            items.map((item) => ({
              baseFeedPosition: item.baseFeedPosition,
              flashcardId: item.flashcardId,
              id: item.id,
              reelPosition: item.reelPosition,
              studySessionId: item.studySessionId,
            }))
          )
          .run();
      }

      const updated = transaction
        .update(studySessions)
        .set({ strategyState })
        .where(and(eq(studySessions.id, sessionId), isNull(studySessions.completedAt)))
        .returning({ id: studySessions.id })
        .all();
      if (updated.length === 0) {
        throw new Error(`Could not update active study session ${sessionId}`);
      }
    });
  }
}
