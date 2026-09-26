import { and, asc, eq, gt, isNotNull } from "drizzle-orm";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { StudySessionAggregationQuery } from "@/features/study/domain/study-session-aggregation.query";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { StudySessionScopeSchema } from "@/features/study/contracts/study-session.schema";
import { StudySession } from "@/features/study/domain/study-session.model";
import { flashcardReviewAttempts, flashcards, studySessions } from "@/infrastructure/sqlite/schema";

export class SQLiteStudySessionAggregationQuery<
  TRunResult = unknown,
> implements StudySessionAggregationQuery {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async findCompletedSessionsPendingAggregation(limit: number): Promise<StudySession[]> {
    if (limit <= 0) {
      return [];
    }
    const rows = await this.database
      .selectDistinct({ session: studySessions })
      .from(studySessions)
      .innerJoin(flashcardReviewAttempts, pendingRatedAttemptJoin)
      .where(isNotNull(studySessions.completedAt))
      .orderBy(asc(studySessions.completedAt), asc(studySessions.id))
      .limit(limit);
    return rows.map(({ session }) => toModel(session));
  }

  async findCompletedSessionsPendingAggregationForDeck(
    deckId: DeckId,
    limit: number
  ): Promise<StudySession[]> {
    if (limit <= 0) {
      return [];
    }
    const rows = await this.database
      .selectDistinct({ session: studySessions })
      .from(studySessions)
      .innerJoin(flashcardReviewAttempts, pendingRatedAttemptJoin)
      .innerJoin(
        flashcards,
        and(eq(flashcards.id, flashcardReviewAttempts.flashcardId), eq(flashcards.deckId, deckId))
      )
      .where(isNotNull(studySessions.completedAt))
      .orderBy(asc(studySessions.completedAt), asc(studySessions.id))
      .limit(limit);
    return rows.map(({ session }) => toModel(session));
  }
}

const pendingRatedAttemptJoin = and(
  eq(flashcardReviewAttempts.studySessionId, studySessions.id),
  gt(flashcardReviewAttempts.reelPosition, studySessions.aggregatedThroughReelPosition),
  isNotNull(flashcardReviewAttempts.rating),
  isNotNull(flashcardReviewAttempts.ratedAt)
);

function toModel(row: typeof studySessions.$inferSelect): StudySession {
  return new StudySession({
    completedAt: row.completedAt,
    aggregatedThroughReelPosition: row.aggregatedThroughReelPosition,
    createdAt: row.createdAt,
    currentReelPosition: row.currentReelPosition,
    furthestReelPosition: row.furthestReelPosition,
    deckId: row.deckId,
    id: row.id,
    lastActiveAt: row.lastActiveAt,
    scope: StudySessionScopeSchema.parse(row.scope),
    feedState: row.feedState,
  });
}
