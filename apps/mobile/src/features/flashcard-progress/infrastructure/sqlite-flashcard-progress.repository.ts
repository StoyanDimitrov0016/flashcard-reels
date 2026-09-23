import { asc, inArray } from "drizzle-orm";

import type { FlashcardProgressRepository } from "@/features/flashcard-progress/domain/flashcard-progress.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import { flashcardProgress } from "@/infrastructure/sqlite/schema";

export class SQLiteFlashcardProgressRepository<
  TRunResult = unknown,
> implements FlashcardProgressRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async findByFlashcardId(flashcardId: string): Promise<FlashcardProgress | null> {
    const progress = await this.findByFlashcardIds([flashcardId]);
    return progress.get(flashcardId) ?? null;
  }

  async findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, FlashcardProgress>> {
    if (flashcardIds.length === 0) {
      return new Map();
    }
    const rows = await this.database
      .select()
      .from(flashcardProgress)
      .where(inArray(flashcardProgress.flashcardId, flashcardIds))
      .orderBy(asc(flashcardProgress.flashcardId));
    return new Map(rows.map((row) => [row.flashcardId, this.toModel(row)] as const));
  }

  private toModel(row: typeof flashcardProgress.$inferSelect): FlashcardProgress {
    return new FlashcardProgress({
      againCount: row.againCount,
      createdAt: row.createdAt,
      easyCount: row.easyCount,
      firstReviewedAt: row.firstReviewedAt,
      flashcardId: row.flashcardId,
      goodCount: row.goodCount,
      hardCount: row.hardCount,
      lastReviewedAt: row.lastReviewedAt,
      resetAt: row.resetAt,
      reviewCount: row.reviewCount,
      updatedAt: row.updatedAt,
    });
  }
}
