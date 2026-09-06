import { and, asc, eq, gte, isNull, lt, lte, max } from "drizzle-orm";

import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { ReviewAttemptRepository } from "@/features/study/domain/review-attempt.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { flashcardReviewAttempts } from "@/infrastructure/sqlite/schema";

export class SQLiteReviewAttemptRepository<
  TRunResult = unknown,
> implements ReviewAttemptRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async create(attempt: FlashcardReviewAttempt): Promise<void> {
    await this.database.insert(flashcardReviewAttempts).values({
      createdAt: attempt.createdAt,
      finalizedAt: attempt.finalizedAt,
      flashcardId: attempt.flashcardId,
      id: attempt.id,
      rating: attempt.rating,
      reelPosition: attempt.reelPosition,
      studySessionId: attempt.studySessionId,
      updatedAt: attempt.updatedAt,
    });
  }

  async finalize(attemptId: string, finalizedAt: string, updatedAt: string): Promise<void> {
    await this.database
      .update(flashcardReviewAttempts)
      .set({ finalizedAt, updatedAt })
      .where(
        and(eq(flashcardReviewAttempts.id, attemptId), isNull(flashcardReviewAttempts.finalizedAt))
      );
  }

  async findById(attemptId: string): Promise<FlashcardReviewAttempt | null> {
    const rows = await this.database
      .select()
      .from(flashcardReviewAttempts)
      .where(eq(flashcardReviewAttempts.id, attemptId))
      .limit(1);
    const row = rows[0];
    return row ? this.toModel(row) : null;
  }

  async findBySessionAndReelPosition(
    studySessionId: string,
    reelPosition: number
  ): Promise<FlashcardReviewAttempt | null> {
    const rows = await this.database
      .select()
      .from(flashcardReviewAttempts)
      .where(
        and(
          eq(flashcardReviewAttempts.studySessionId, studySessionId),
          eq(flashcardReviewAttempts.reelPosition, reelPosition)
        )
      )
      .orderBy(asc(flashcardReviewAttempts.createdAt), asc(flashcardReviewAttempts.id))
      .limit(1);
    const row = rows[0];
    return row ? this.toModel(row) : null;
  }

  async listBySessionAndReelPositionRange(
    studySessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<FlashcardReviewAttempt[]> {
    const rows = await this.database
      .select()
      .from(flashcardReviewAttempts)
      .where(
        and(
          eq(flashcardReviewAttempts.studySessionId, studySessionId),
          gte(flashcardReviewAttempts.reelPosition, fromReelPosition),
          lte(flashcardReviewAttempts.reelPosition, throughReelPosition)
        )
      )
      .orderBy(
        asc(flashcardReviewAttempts.reelPosition),
        asc(flashcardReviewAttempts.createdAt),
        asc(flashcardReviewAttempts.id)
      );
    return rows.map((row) => this.toModel(row));
  }

  async findMaxReelPosition(studySessionId: string): Promise<number | null> {
    const rows = await this.database
      .select({ reelPosition: max(flashcardReviewAttempts.reelPosition) })
      .from(flashcardReviewAttempts)
      .where(eq(flashcardReviewAttempts.studySessionId, studySessionId));
    return rows[0]?.reelPosition ?? null;
  }

  async listUnfinalizedBeforeReelPosition(
    studySessionId: string,
    reelPosition: number
  ): Promise<FlashcardReviewAttempt[]> {
    const rows = await this.database
      .select()
      .from(flashcardReviewAttempts)
      .where(
        and(
          eq(flashcardReviewAttempts.studySessionId, studySessionId),
          isNull(flashcardReviewAttempts.finalizedAt),
          lt(flashcardReviewAttempts.reelPosition, reelPosition)
        )
      )
      .orderBy(
        asc(flashcardReviewAttempts.reelPosition),
        asc(flashcardReviewAttempts.createdAt),
        asc(flashcardReviewAttempts.id)
      );
    return rows.map((row) => this.toModel(row));
  }

  private toModel(row: typeof flashcardReviewAttempts.$inferSelect): FlashcardReviewAttempt {
    return new FlashcardReviewAttempt({
      createdAt: row.createdAt,
      finalizedAt: row.finalizedAt,
      flashcardId: row.flashcardId,
      id: row.id,
      reelPosition: row.reelPosition,
      rating: row.rating,
      studySessionId: row.studySessionId,
      updatedAt: row.updatedAt,
    });
  }
}
