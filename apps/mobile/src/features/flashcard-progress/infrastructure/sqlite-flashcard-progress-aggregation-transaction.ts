import { and, asc, eq, gt, inArray, isNotNull, lte } from "drizzle-orm";

import type {
  FlashcardProgressAggregationResult,
  FlashcardProgressAggregationTransaction,
} from "@/features/flashcard-progress/application/flashcard-progress-aggregation-transaction";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { AGGREGATION_CHUNK_SIZE } from "@/features/study/domain/review-attempts";
import {
  flashcardReviewAttempts,
  flashcards,
  flashcardProgress,
  studySessions,
} from "@/infrastructure/sqlite/schema";

type Contribution = Readonly<{
  againCount: number;
  easyCount: number;
  firstReviewedAt: string;
  goodCount: number;
  hardCount: number;
  lastReviewedAt: string;
}>;

export class SQLiteFlashcardProgressAggregationTransaction<
  TRunResult = unknown,
> implements FlashcardProgressAggregationTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async aggregate(
    studySessionId: string,
    throughReelPosition: number,
    now: string
  ): Promise<FlashcardProgressAggregationResult> {
    return this.database.transaction((transaction) => {
      const session = transaction
        .select({
          aggregatedThroughReelPosition: studySessions.aggregatedThroughReelPosition,
        })
        .from(studySessions)
        .where(eq(studySessions.id, studySessionId))
        .limit(1)
        .all()[0];
      if (!session) {
        throw new Error(`Missing study session ${studySessionId}`);
      }

      const through = Math.min(
        throughReelPosition,
        session.aggregatedThroughReelPosition + AGGREGATION_CHUNK_SIZE
      );
      if (through <= session.aggregatedThroughReelPosition) {
        return {
          aggregatedAttemptCount: 0,
          throughReelPosition: session.aggregatedThroughReelPosition,
        };
      }

      const attempts = transaction
        .select()
        .from(flashcardReviewAttempts)
        .where(
          and(
            eq(flashcardReviewAttempts.studySessionId, studySessionId),
            gt(flashcardReviewAttempts.reelPosition, session.aggregatedThroughReelPosition),
            lte(flashcardReviewAttempts.reelPosition, through),
            isNotNull(flashcardReviewAttempts.finalizedAt),
            isNotNull(flashcardReviewAttempts.rating),
            isNotNull(flashcardReviewAttempts.ratedAt)
          )
        )
        .orderBy(asc(flashcardReviewAttempts.reelPosition), asc(flashcardReviewAttempts.id))
        .all();
      const flashcardIds = [...new Set(attempts.map((attempt) => attempt.flashcardId))];
      const existingProgress =
        flashcardIds.length === 0
          ? []
          : transaction
              .select()
              .from(flashcardProgress)
              .where(inArray(flashcardProgress.flashcardId, flashcardIds))
              .all();
      const progressById = new Map(
        existingProgress.map((progress) => [progress.flashcardId, progress])
      );
      const contributions = new Map<string, Contribution>();
      let aggregatedAttemptCount = 0;

      for (const attempt of attempts) {
        const ratedAt = attempt.ratedAt;
        const rating = attempt.rating;
        const progress = progressById.get(attempt.flashcardId);
        if (
          ratedAt === null ||
          rating === null ||
          (progress?.resetAt !== null &&
            progress?.resetAt !== undefined &&
            ratedAt <= progress.resetAt)
        ) {
          continue;
        }
        const current = contributions.get(attempt.flashcardId);
        contributions.set(
          attempt.flashcardId,
          current ? addContribution(current, rating, ratedAt) : newContribution(rating, ratedAt)
        );
        aggregatedAttemptCount += 1;
      }

      const missingFlashcardIds = flashcardIds.filter(
        (flashcardId) => !progressById.has(flashcardId)
      );
      const missingFlashcards =
        missingFlashcardIds.length === 0
          ? []
          : transaction
              .select({
                createdAt: flashcards.createdAt,
                deckId: flashcards.deckId,
                id: flashcards.id,
              })
              .from(flashcards)
              .where(inArray(flashcards.id, missingFlashcardIds))
              .all();
      const createdAtByFlashcardId = new Map(
        missingFlashcards.map((flashcard) => [flashcard.id, flashcard.createdAt])
      );
      const deckIdByFlashcardId = new Map(
        missingFlashcards.map((flashcard) => [flashcard.id, flashcard.deckId])
      );

      for (const [flashcardId, contribution] of contributions) {
        const progress = progressById.get(flashcardId);
        const createdAt = progress?.createdAt ?? createdAtByFlashcardId.get(flashcardId);
        const deckId = progress?.deckId ?? deckIdByFlashcardId.get(flashcardId);
        if (!createdAt || !deckId) {
          throw new Error(`Missing flashcard ${flashcardId} for card progress aggregation`);
        }
        const firstReviewedAt = progress?.firstReviewedAt
          ? minTimestamp(progress.firstReviewedAt, contribution.firstReviewedAt)
          : contribution.firstReviewedAt;
        const lastReviewedAt = progress?.lastReviewedAt
          ? maxTimestamp(progress.lastReviewedAt, contribution.lastReviewedAt)
          : contribution.lastReviewedAt;
        const againCount = (progress?.againCount ?? 0) + contribution.againCount;
        const hardCount = (progress?.hardCount ?? 0) + contribution.hardCount;
        const goodCount = (progress?.goodCount ?? 0) + contribution.goodCount;
        const easyCount = (progress?.easyCount ?? 0) + contribution.easyCount;
        transaction
          .insert(flashcardProgress)
          .values({
            againCount,
            createdAt,
            deckId,
            easyCount,
            firstReviewedAt,
            flashcardId,
            goodCount,
            hardCount,
            lastReviewedAt,
            resetAt: progress?.resetAt ?? null,
            reviewCount: againCount + hardCount + goodCount + easyCount,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: flashcardProgress.flashcardId,
            set: {
              againCount,
              easyCount,
              firstReviewedAt,
              goodCount,
              hardCount,
              lastReviewedAt,
              reviewCount: againCount + hardCount + goodCount + easyCount,
              updatedAt: now,
            },
          })
          .run();
      }

      const checkpointUpdated = transaction
        .update(studySessions)
        .set({ aggregatedThroughReelPosition: through })
        .where(
          and(
            eq(studySessions.id, studySessionId),
            eq(studySessions.aggregatedThroughReelPosition, session.aggregatedThroughReelPosition)
          )
        )
        .returning({ id: studySessions.id })
        .all();
      if (checkpointUpdated.length === 0) {
        throw new Error(`Could not advance aggregation checkpoint for ${studySessionId}`);
      }

      return { aggregatedAttemptCount, throughReelPosition: through };
    });
  }
}

function newContribution(rating: RecallLevel, reviewedAt: string): Contribution {
  return {
    againCount: rating === "again" ? 1 : 0,
    easyCount: rating === "easy" ? 1 : 0,
    firstReviewedAt: reviewedAt,
    goodCount: rating === "good" ? 1 : 0,
    hardCount: rating === "hard" ? 1 : 0,
    lastReviewedAt: reviewedAt,
  };
}

function addContribution(
  contribution: Contribution,
  rating: RecallLevel,
  reviewedAt: string
): Contribution {
  const next = newContribution(rating, reviewedAt);
  return {
    againCount: contribution.againCount + next.againCount,
    easyCount: contribution.easyCount + next.easyCount,
    firstReviewedAt: minTimestamp(contribution.firstReviewedAt, next.firstReviewedAt),
    goodCount: contribution.goodCount + next.goodCount,
    hardCount: contribution.hardCount + next.hardCount,
    lastReviewedAt: maxTimestamp(contribution.lastReviewedAt, next.lastReviewedAt),
  };
}

function minTimestamp(left: string, right: string): string {
  return left <= right ? left : right;
}

function maxTimestamp(left: string, right: string): string {
  return left >= right ? left : right;
}
