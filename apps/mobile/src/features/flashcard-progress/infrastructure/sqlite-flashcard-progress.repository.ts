import { and, asc, eq, gt, inArray, isNotNull } from "drizzle-orm";

import type { FlashcardProgressRepository } from "@/features/flashcard-progress/domain/flashcard-progress.repository";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { FlashcardProgress } from "@/features/flashcard-progress/domain/flashcard-progress.model";
import {
  flashcardReviewAttempts,
  flashcards,
  flashcardProgress,
  studySessions,
} from "@/infrastructure/sqlite/schema";

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

  async findIncludingPendingRatingsByFlashcardIds(
    flashcardIds: readonly string[]
  ): Promise<ReadonlyMap<string, FlashcardProgress>> {
    if (flashcardIds.length === 0) {
      return new Map();
    }
    const stored = await this.findByFlashcardIds(flashcardIds);
    const cards = await this.database
      .select({ createdAt: flashcards.createdAt, id: flashcards.id })
      .from(flashcards)
      .where(inArray(flashcards.id, flashcardIds));
    const pending = await this.database
      .select({
        flashcardId: flashcardReviewAttempts.flashcardId,
        ratedAt: flashcardReviewAttempts.ratedAt,
        rating: flashcardReviewAttempts.rating,
      })
      .from(flashcardReviewAttempts)
      .innerJoin(studySessions, eq(studySessions.id, flashcardReviewAttempts.studySessionId))
      .where(
        and(
          inArray(flashcardReviewAttempts.flashcardId, flashcardIds),
          isNotNull(flashcardReviewAttempts.rating),
          isNotNull(flashcardReviewAttempts.ratedAt),
          gt(flashcardReviewAttempts.reelPosition, studySessions.aggregatedThroughReelPosition)
        )
      );
    const createdAtById = new Map(cards.map((card) => [card.id, card.createdAt] as const));
    const current = new Map(stored);
    for (const attempt of pending) {
      if (!attempt.rating || !attempt.ratedAt) {
        continue;
      }
      const progress = current.get(attempt.flashcardId);
      if (progress?.resetAt && attempt.ratedAt <= progress.resetAt) {
        continue;
      }
      const createdAt = progress?.createdAt ?? createdAtById.get(attempt.flashcardId);
      if (!createdAt) {
        continue;
      }
      current.set(
        attempt.flashcardId,
        addPendingRating(progress, attempt.flashcardId, attempt.rating, attempt.ratedAt, createdAt)
      );
    }
    return current;
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

function addPendingRating(
  progress: FlashcardProgress | undefined,
  flashcardId: string,
  rating: RecallLevel,
  ratedAt: string,
  createdAt: string
): FlashcardProgress {
  const againCount = (progress?.againCount ?? 0) + (rating === "again" ? 1 : 0);
  const hardCount = (progress?.hardCount ?? 0) + (rating === "hard" ? 1 : 0);
  const goodCount = (progress?.goodCount ?? 0) + (rating === "good" ? 1 : 0);
  const easyCount = (progress?.easyCount ?? 0) + (rating === "easy" ? 1 : 0);
  return new FlashcardProgress({
    againCount,
    createdAt,
    easyCount,
    firstReviewedAt:
      progress?.firstReviewedAt && progress.firstReviewedAt < ratedAt
        ? progress.firstReviewedAt
        : ratedAt,
    flashcardId,
    goodCount,
    hardCount,
    lastReviewedAt:
      progress?.lastReviewedAt && progress.lastReviewedAt > ratedAt
        ? progress.lastReviewedAt
        : ratedAt,
    resetAt: progress?.resetAt ?? null,
    reviewCount: againCount + hardCount + goodCount + easyCount,
    updatedAt: ratedAt,
  });
}
