import type { SQLiteDatabase } from "expo-sqlite";

import { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { ReviewAttemptRepository } from "@/features/study/domain/review-attempt.repository";
import {
  RecallLevelSchema,
  type RecallLevel,
} from "@/features/study/domain/flashcard-review.model";
import { z } from "zod";

const ReviewAttemptRowSchema = z.compile(
  z.object({
    created_at: z.string(),
    finalized_at: z.string().nullable(),
    flashcard_id: z.string(),
    id: z.string(),
    reel_position: z.number().int().nonnegative(),
    rating: RecallLevelSchema.nullable(),
    study_session_id: z.string(),
    updated_at: z.string(),
  })
);
type ReviewAttemptRow = z.infer<typeof ReviewAttemptRowSchema>;

export class SQLiteReviewAttemptRepository implements ReviewAttemptRepository {
  private readonly database: SQLiteDatabase;

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  async create(attempt: FlashcardReviewAttempt): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO flashcard_review_attempts
        (id, study_session_id, flashcard_id, reel_position, rating, created_at, updated_at, finalized_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      attempt.id,
      attempt.studySessionId,
      attempt.flashcardId,
      attempt.reelPosition,
      attempt.rating,
      attempt.createdAt,
      attempt.updatedAt,
      attempt.finalizedAt
    );
  }

  async updateRating(attemptId: string, rating: RecallLevel, updatedAt: string): Promise<boolean> {
    const result = await this.database.runAsync(
      "UPDATE flashcard_review_attempts SET rating = ?, updated_at = ? WHERE id = ? AND finalized_at IS NULL",
      rating,
      updatedAt,
      attemptId
    );
    return result.changes > 0;
  }

  async finalize(attemptId: string, finalizedAt: string, updatedAt: string): Promise<void> {
    await this.database.runAsync(
      "UPDATE flashcard_review_attempts SET finalized_at = ?, updated_at = ? WHERE id = ? AND finalized_at IS NULL",
      finalizedAt,
      updatedAt,
      attemptId
    );
  }

  async findById(attemptId: string): Promise<FlashcardReviewAttempt | null> {
    const row = await this.database.getFirstAsync<unknown>(
      `SELECT id, study_session_id, flashcard_id, reel_position, rating, created_at, updated_at, finalized_at
       FROM flashcard_review_attempts
       WHERE id = ?`,
      attemptId
    );
    return row ? this.toModel(ReviewAttemptRowSchema.parse(row)) : null;
  }

  async listUnfinalizedBeforeReelPosition(reelPosition: number): Promise<FlashcardReviewAttempt[]> {
    const rows = await this.database.getAllAsync<unknown>(
      `SELECT id, study_session_id, flashcard_id, reel_position, rating, created_at, updated_at, finalized_at
       FROM flashcard_review_attempts
       WHERE finalized_at IS NULL AND reel_position < ?
       ORDER BY reel_position, created_at, id`,
      reelPosition
    );
    return rows.map((row) => this.toModel(ReviewAttemptRowSchema.parse(row)));
  }

  private toModel(row: ReviewAttemptRow): FlashcardReviewAttempt {
    return new FlashcardReviewAttempt({
      createdAt: row.created_at,
      finalizedAt: row.finalized_at,
      flashcardId: row.flashcard_id,
      id: row.id,
      reelPosition: row.reel_position,
      rating: row.rating,
      studySessionId: row.study_session_id,
      updatedAt: row.updated_at,
    });
  }
}
