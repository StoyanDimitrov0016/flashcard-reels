import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

import type { StudySessionItemRepository } from "@/features/study/domain/study-session-item.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { StudySessionItem } from "@/features/study/domain/study-session-item.model";
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
              reelPosition: item.reelPosition,
              studySessionId: item.studySessionId,
            }))
          )
          .run();
      }
    });
  }

  async findMaxBaseFeedPosition(studySessionId: string): Promise<number | null> {
    const rows = await this.database
      .select({ baseFeedPosition: studySessionItems.baseFeedPosition })
      .from(studySessionItems)
      .where(eq(studySessionItems.studySessionId, studySessionId))
      .orderBy(desc(studySessionItems.baseFeedPosition))
      .limit(1);
    return rows[0]?.baseFeedPosition ?? null;
  }

  async findMaxReelPosition(studySessionId: string): Promise<number | null> {
    const rows = await this.database
      .select({ reelPosition: studySessionItems.reelPosition })
      .from(studySessionItems)
      .where(eq(studySessionItems.studySessionId, studySessionId))
      .orderBy(desc(studySessionItems.reelPosition))
      .limit(1);
    return rows[0]?.reelPosition ?? null;
  }

  async listBySessionId(studySessionId: string): Promise<StudySessionItem[]> {
    return this.listBySessionIdInReelPositionRange(studySessionId, 0, Number.MAX_SAFE_INTEGER);
  }

  async listBySessionIdInReelPositionRange(
    studySessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<StudySessionItem[]> {
    const rows = await this.database
      .select()
      .from(studySessionItems)
      .where(
        and(
          eq(studySessionItems.studySessionId, studySessionId),
          gte(studySessionItems.reelPosition, fromReelPosition),
          lte(studySessionItems.reelPosition, throughReelPosition)
        )
      )
      .orderBy(asc(studySessionItems.reelPosition), asc(studySessionItems.id));
    return rows.map(
      (row) =>
        new StudySessionItem({
          baseFeedPosition: row.baseFeedPosition,
          flashcardId: row.flashcardId,
          id: row.id,
          reelPosition: row.reelPosition,
          studySessionId: row.studySessionId,
        })
    );
  }
}
