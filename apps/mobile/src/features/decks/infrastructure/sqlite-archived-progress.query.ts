import { asc, eq, sql } from "drizzle-orm";

import type { ArchivedProgressQuery } from "@/features/decks/domain/archived-progress.query";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import {
  cardProgress,
  deckProgress,
  flashcardMemoryStates,
  reviewEvents,
} from "@/infrastructure/sqlite/schema";

export class SQLiteArchivedProgressQuery<TRunResult = unknown> implements ArchivedProgressQuery {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async listArchivedProgress() {
    const records = await this.database
      .select()
      .from(deckProgress)
      .where(eq(deckProgress.resolution, "archived"))
      .orderBy(asc(deckProgress.title), asc(deckProgress.deckId));
    return Promise.all(
      records.map(async (record) => {
        const [events, progress, memory] = await Promise.all([
          this.database
            .select({
              bytes: sql<number>`coalesce(sum(length(${reviewEvents.id}) + length(${reviewEvents.deckId}) + length(${reviewEvents.flashcardId}) + length(${reviewEvents.rating}) + length(${reviewEvents.reviewedAt}) + length(${reviewEvents.finalizedAt}) + 64), 0)`,
            })
            .from(reviewEvents)
            .where(eq(reviewEvents.deckId, record.deckId)),
          this.database
            .select({
              reviewCount: sql<number>`coalesce(sum(${cardProgress.reviewCount}), 0)`,
              reviewedCardCount: sql<number>`sum(case when ${cardProgress.reviewCount} > 0 then 1 else 0 end)`,
              bytes: sql<number>`coalesce(sum(length(${cardProgress.flashcardId}) + length(${cardProgress.deckId}) + 160), 0)`,
            })
            .from(cardProgress)
            .where(eq(cardProgress.deckId, record.deckId)),
          this.database
            .select({
              bytes: sql<number>`coalesce(sum(length(${flashcardMemoryStates.flashcardId}) + length(${flashcardMemoryStates.deckId}) + 160), 0)`,
            })
            .from(flashcardMemoryStates)
            .where(eq(flashcardMemoryStates.deckId, record.deckId)),
        ]);
        return {
          deckId: record.deckId,
          title: record.title,
          version: record.version,
          lastReviewedAt: record.lastReviewedAt,
          reviewCount: progress[0]?.reviewCount ?? 0,
          reviewedCardCount: progress[0]?.reviewedCardCount ?? 0,
          estimatedBytes:
            (events[0]?.bytes ?? 0) +
            (progress[0]?.bytes ?? 0) +
            (memory[0]?.bytes ?? 0) +
            record.title.length +
            96,
        };
      })
    );
  }
}
