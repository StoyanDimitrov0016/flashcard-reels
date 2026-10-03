import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

import type { StudySessionReelRepository } from "@/features/study/domain/study-session-reel.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { StudySessionReel } from "@/features/study/domain/study-session-reel.model";
import { studySessionReels } from "@/infrastructure/sqlite/schema";

const INSERT_BATCH_SIZE = 200;

export class SQLiteStudySessionReelRepository<
  TRunResult = unknown,
> implements StudySessionReelRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async createMany(items: readonly StudySessionReel[]): Promise<void> {
    this.database.transaction((transaction) => {
      for (let offset = 0; offset < items.length; offset += INSERT_BATCH_SIZE) {
        const batch = items.slice(offset, offset + INSERT_BATCH_SIZE);
        if (batch.length === 0) {
          continue;
        }
        transaction
          .insert(studySessionReels)
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
      .select({ baseFeedPosition: studySessionReels.baseFeedPosition })
      .from(studySessionReels)
      .where(eq(studySessionReels.studySessionId, studySessionId))
      .orderBy(desc(studySessionReels.baseFeedPosition))
      .limit(1);
    return rows[0]?.baseFeedPosition ?? null;
  }

  async findMaxReelPosition(studySessionId: string): Promise<number | null> {
    const rows = await this.database
      .select({ reelPosition: studySessionReels.reelPosition })
      .from(studySessionReels)
      .where(eq(studySessionReels.studySessionId, studySessionId))
      .orderBy(desc(studySessionReels.reelPosition))
      .limit(1);
    return rows[0]?.reelPosition ?? null;
  }

  async listBySessionId(studySessionId: string): Promise<StudySessionReel[]> {
    return this.listBySessionIdInReelPositionRange(studySessionId, 0, Number.MAX_SAFE_INTEGER);
  }

  async listBySessionIdInReelPositionRange(
    studySessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<StudySessionReel[]> {
    const rows = await this.database
      .select()
      .from(studySessionReels)
      .where(
        and(
          eq(studySessionReels.studySessionId, studySessionId),
          gte(studySessionReels.reelPosition, fromReelPosition),
          lte(studySessionReels.reelPosition, throughReelPosition)
        )
      )
      .orderBy(asc(studySessionReels.reelPosition), asc(studySessionReels.id));
    return rows.map(
      (row) =>
        new StudySessionReel({
          baseFeedPosition: row.baseFeedPosition,
          flashcardId: row.flashcardId,
          id: row.id,
          reelPosition: row.reelPosition,
          studySessionId: row.studySessionId,
        })
    );
  }
}
