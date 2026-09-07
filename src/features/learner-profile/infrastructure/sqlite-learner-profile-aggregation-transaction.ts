import { and, asc, eq, gt, inArray, isNotNull, lte } from "drizzle-orm";

import { AGGREGATION_CHUNK_SIZE } from "@/features/study/config/review-attempts";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import type {
  LearnerProfileAggregationResult,
  LearnerProfileAggregationTransaction,
} from "@/features/learner-profile/application/learner-profile-aggregation-transaction";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import {
  flashcardReviewAttempts,
  flashcards,
  learnerProfiles,
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

export class SQLiteLearnerProfileAggregationTransaction<
  TRunResult = unknown,
> implements LearnerProfileAggregationTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async aggregate(
    studySessionId: string,
    throughReelPosition: number,
    now: string
  ): Promise<LearnerProfileAggregationResult> {
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
      const existingProfiles =
        flashcardIds.length === 0
          ? []
          : transaction
              .select()
              .from(learnerProfiles)
              .where(inArray(learnerProfiles.flashcardId, flashcardIds))
              .all();
      const profilesById = new Map(
        existingProfiles.map((profile) => [profile.flashcardId, profile])
      );
      const contributions = new Map<string, Contribution>();
      let aggregatedAttemptCount = 0;

      for (const attempt of attempts) {
        const ratedAt = attempt.ratedAt;
        const rating = attempt.rating;
        const profile = profilesById.get(attempt.flashcardId);
        if (
          ratedAt === null ||
          rating === null ||
          (profile?.resetAt !== null &&
            profile?.resetAt !== undefined &&
            ratedAt <= profile.resetAt)
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
        (flashcardId) => !profilesById.has(flashcardId)
      );
      const missingFlashcards =
        missingFlashcardIds.length === 0
          ? []
          : transaction
              .select({ createdAt: flashcards.createdAt, id: flashcards.id })
              .from(flashcards)
              .where(inArray(flashcards.id, missingFlashcardIds))
              .all();
      const createdAtByFlashcardId = new Map(
        missingFlashcards.map((flashcard) => [flashcard.id, flashcard.createdAt])
      );

      for (const [flashcardId, contribution] of contributions) {
        const profile = profilesById.get(flashcardId);
        const createdAt = profile?.createdAt ?? createdAtByFlashcardId.get(flashcardId);
        if (!createdAt) {
          throw new Error(`Missing flashcard ${flashcardId} for learner profile aggregation`);
        }
        const firstReviewedAt = profile?.firstReviewedAt
          ? minTimestamp(profile.firstReviewedAt, contribution.firstReviewedAt)
          : contribution.firstReviewedAt;
        const lastReviewedAt = profile?.lastReviewedAt
          ? maxTimestamp(profile.lastReviewedAt, contribution.lastReviewedAt)
          : contribution.lastReviewedAt;
        const againCount = (profile?.againCount ?? 0) + contribution.againCount;
        const hardCount = (profile?.hardCount ?? 0) + contribution.hardCount;
        const goodCount = (profile?.goodCount ?? 0) + contribution.goodCount;
        const easyCount = (profile?.easyCount ?? 0) + contribution.easyCount;
        transaction
          .insert(learnerProfiles)
          .values({
            againCount,
            createdAt,
            easyCount,
            firstReviewedAt,
            flashcardId,
            goodCount,
            hardCount,
            lastReviewedAt,
            resetAt: profile?.resetAt ?? null,
            reviewCount: againCount + hardCount + goodCount + easyCount,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: learnerProfiles.flashcardId,
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
