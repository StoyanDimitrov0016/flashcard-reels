import { asc, eq } from "drizzle-orm";

import { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudySessionItemRepository } from "@/features/study/domain/study-session-item.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { studySessionItems } from "@/infrastructure/sqlite/schema";

const INSERT_BATCH_SIZE = 200;

export class SQLiteStudySessionItemRepository<
  TRunResult = unknown,
> implements StudySessionItemRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async createMany(items: readonly StudySessionItem[]): Promise<void> {
    this.database.transaction((transaction) => {
      for (let offset = 0; offset < items.length; offset += INSERT_BATCH_SIZE) {
        const batch = items.slice(offset, offset + INSERT_BATCH_SIZE);
        if (batch.length === 0) {
          continue;
        }
        transaction
          .insert(studySessionItems)
          .values(
            batch.map((item) => ({
              baseFeedPosition: item.baseFeedPosition,
              flashcardId: item.flashcardId,
              id: item.id,
              studySessionId: item.studySessionId,
            }))
          )
          .run();
      }
    });
  }

  async listBySessionId(studySessionId: string): Promise<StudySessionItem[]> {
    const rows = await this.database
      .select()
      .from(studySessionItems)
      .where(eq(studySessionItems.studySessionId, studySessionId))
      .orderBy(asc(studySessionItems.baseFeedPosition), asc(studySessionItems.id));
    return rows.map(
      (row) =>
        new StudySessionItem({
          baseFeedPosition: row.baseFeedPosition,
          flashcardId: row.flashcardId,
          id: row.id,
          studySessionId: row.studySessionId,
        })
    );
  }
}
