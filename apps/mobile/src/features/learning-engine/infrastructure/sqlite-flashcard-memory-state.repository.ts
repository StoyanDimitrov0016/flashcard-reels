import { inArray, eq } from "drizzle-orm";

import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { flashcardMemoryStates } from "@/infrastructure/sqlite/schema";

import type { FlashcardMemoryStateRepository } from "../domain/flashcard-memory-state.repository";
import type { LearnerMemoryState } from "../domain/memory-state";

export class SQLiteFlashcardMemoryStateRepository<
  TRunResult = unknown,
> implements FlashcardMemoryStateRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async findByFlashcardId(flashcardId: string): Promise<LearnerMemoryState | null> {
    const rows = await this.database
      .select()
      .from(flashcardMemoryStates)
      .where(eq(flashcardMemoryStates.flashcardId, flashcardId))
      .limit(1);
    const row = rows[0];
    return row ? toModel(row) : null;
  }

  async findByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, LearnerMemoryState>> {
    if (flashcardIds.length === 0) {
      return new Map();
    }
    const rows = await this.database
      .select()
      .from(flashcardMemoryStates)
      .where(inArray(flashcardMemoryStates.flashcardId, flashcardIds));
    return new Map(rows.map((row) => [row.flashcardId, toModel(row)] as const));
  }
}

function toModel(row: typeof flashcardMemoryStates.$inferSelect): LearnerMemoryState {
  return {
    createdAt: row.createdAt,
    dueAt: row.dueAt,
    difficulty: row.difficulty,
    elapsedDays: row.elapsedDays,
    flashcardId: row.flashcardId,
    lapses: row.lapses,
    lastReviewAt: row.lastReviewAt,
    learningSteps: row.learningSteps,
    reps: row.reps,
    scheduledDays: row.scheduledDays,
    stability: row.stability,
    state: row.state,
    updatedAt: row.updatedAt,
  };
}
