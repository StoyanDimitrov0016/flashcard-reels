import type { SQLiteDatabase } from "expo-sqlite";

import { FlashcardReview, RecallLevelSchema } from "@/features/study/domain/flashcard-review.model";
import type { ReviewRepository } from "@/features/study/domain/review.repository";
import { z } from "zod";

const ReviewRowSchema = z.compile(
  z.object({
    flashcard_id: z.string(),
    id: z.string(),
    level: RecallLevelSchema,
    reviewed_at: z.string(),
  })
);
type ReviewRow = z.infer<typeof ReviewRowSchema>;

export class SQLiteReviewRepository implements ReviewRepository {
  private readonly database: SQLiteDatabase;

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  async listByFlashcardId(flashcardId: string): Promise<FlashcardReview[]> {
    const rows = await this.database.getAllAsync<unknown>(
      "SELECT id, flashcard_id, level, reviewed_at FROM flashcard_reviews WHERE flashcard_id = ? ORDER BY reviewed_at DESC",
      flashcardId
    );
    return rows.map((row) => this.toModel(ReviewRowSchema.parse(row)));
  }

  async save(review: FlashcardReview): Promise<void> {
    await this.database.runAsync(
      "INSERT INTO flashcard_reviews (id, flashcard_id, level, reviewed_at) VALUES (?, ?, ?, ?)",
      review.id,
      review.flashcardId,
      review.level,
      review.reviewedAt
    );
  }

  private toModel(row: ReviewRow): FlashcardReview {
    return new FlashcardReview({
      flashcardId: row.flashcard_id,
      id: row.id,
      level: row.level,
      reviewedAt: row.reviewed_at,
    });
  }
}
