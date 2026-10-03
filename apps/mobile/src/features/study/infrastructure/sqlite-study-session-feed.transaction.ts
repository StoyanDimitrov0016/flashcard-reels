import { and, eq, isNull } from "drizzle-orm";

import type { StudySessionFeedTransaction } from "@/features/study/application/study-session-feed.transaction";
import type { StudySessionReel } from "@/features/study/domain/study-session-reel.model";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { studySessionReels, studySessions } from "@/infrastructure/sqlite/schema";
import { OperationError } from "@/shared/errors/operation-error";

export class SQLiteStudySessionFeedTransaction<
  TRunResult = unknown,
> implements StudySessionFeedTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async append(sessionId: string, items: readonly StudySessionReel[]): Promise<void> {
    this.database.transaction((transaction) => {
      const session = transaction
        .select({ id: studySessions.id })
        .from(studySessions)
        .where(and(eq(studySessions.id, sessionId), isNull(studySessions.completedAt)))
        .get();
      if (!session) {
        throw new OperationError({
          code: "STUDY_SESSION_ENDED",
          context: { sessionId },
          message: `Could not update active study session ${sessionId}`,
        });
      }
      if (items.length > 0) {
        transaction
          .insert(studySessionReels)
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
    });
  }

  async updateState(sessionId: string, feedState: string): Promise<void> {
    const updated = await this.database
      .update(studySessions)
      .set({ feedState })
      .where(and(eq(studySessions.id, sessionId), isNull(studySessions.completedAt)))
      .returning({ id: studySessions.id });
    if (updated.length === 0) {
      throw new OperationError({
        code: "STUDY_SESSION_ENDED",
        context: { sessionId },
        message: `Could not update active study session ${sessionId}`,
      });
    }
  }
}
