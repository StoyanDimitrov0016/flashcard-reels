import { and, asc, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";

import type {
  StudySessionPosition,
  StudySessionRepository,
} from "@/features/study/domain/study-session.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { type DeckId } from "@/features/decks/domain/deck.model";
import { StudySessionScopeSchema } from "@/features/study/contracts/study-session.schema";
import { StudySession, type StudySessionScope } from "@/features/study/domain/study-session.model";
import { flashcardReviewAttempts, flashcards, studySessions } from "@/infrastructure/sqlite/schema";

export class SQLiteStudySessionRepository<TRunResult = unknown> implements StudySessionRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async complete(sessionId: string, completedAt: string): Promise<void> {
    await this.database
      .update(studySessions)
      .set({ completedAt })
      .where(and(eq(studySessions.id, sessionId), isNull(studySessions.completedAt)));
  }

  async create(session: StudySession): Promise<void> {
    await this.database.insert(studySessions).values({
      aggregatedThroughReelPosition: session.aggregatedThroughReelPosition,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      currentReelPosition: session.currentReelPosition,
      furthestReelPosition: session.furthestReelPosition,
      deckId: session.deckId,
      id: session.id,
      lastActiveAt: session.lastActiveAt,
      scope: session.scope,
      feedState: session.feedState,
    });
  }

  async findActive(scope: StudySessionScope, deckId: DeckId | null): Promise<StudySession | null> {
    const conditions =
      deckId === null
        ? and(eq(studySessions.scope, scope), isNull(studySessions.deckId))
        : and(eq(studySessions.scope, scope), eq(studySessions.deckId, deckId));
    const rows = await this.database
      .select()
      .from(studySessions)
      .where(and(conditions, isNull(studySessions.completedAt)))
      .orderBy(desc(studySessions.createdAt), desc(studySessions.id))
      .limit(1);
    const row = rows[0];
    return row ? this.toModel(row) : null;
  }

  async findById(sessionId: string): Promise<StudySession | null> {
    const rows = await this.database
      .select()
      .from(studySessions)
      .where(eq(studySessions.id, sessionId))
      .limit(1);
    const row = rows[0];
    return row ? this.toModel(row) : null;
  }

  async findActiveByScope(scope: StudySessionScope): Promise<StudySession | null> {
    const rows = await this.database
      .select()
      .from(studySessions)
      .where(and(eq(studySessions.scope, scope), isNull(studySessions.completedAt)))
      .orderBy(desc(studySessions.createdAt), desc(studySessions.id))
      .limit(1);
    const row = rows[0];
    return row ? this.toModel(row) : null;
  }

  async findCompletedSessionsPendingAggregation(limit: number): Promise<StudySession[]> {
    if (limit <= 0) {
      return [];
    }
    const rows = await this.database
      .selectDistinct({ session: studySessions })
      .from(studySessions)
      .innerJoin(
        flashcardReviewAttempts,
        and(
          eq(flashcardReviewAttempts.studySessionId, studySessions.id),
          gt(flashcardReviewAttempts.reelPosition, studySessions.aggregatedThroughReelPosition),
          isNotNull(flashcardReviewAttempts.rating),
          isNotNull(flashcardReviewAttempts.ratedAt)
        )
      )
      .where(isNotNull(studySessions.completedAt))
      .orderBy(asc(studySessions.completedAt), asc(studySessions.id))
      .limit(limit);
    return rows.map((row) => this.toModel(row.session));
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
      .innerJoin(
        flashcardReviewAttempts,
        and(
          eq(flashcardReviewAttempts.studySessionId, studySessions.id),
          gt(flashcardReviewAttempts.reelPosition, studySessions.aggregatedThroughReelPosition),
          isNotNull(flashcardReviewAttempts.rating),
          isNotNull(flashcardReviewAttempts.ratedAt)
        )
      )
      .innerJoin(
        flashcards,
        and(eq(flashcards.id, flashcardReviewAttempts.flashcardId), eq(flashcards.deckId, deckId))
      )
      .where(isNotNull(studySessions.completedAt))
      .orderBy(asc(studySessions.completedAt), asc(studySessions.id))
      .limit(limit);
    return rows.map((row) => this.toModel(row.session));
  }

  async updateCurrentReelPosition(
    sessionId: string,
    currentReelPosition: number,
    lastActiveAt: string
  ): Promise<StudySessionPosition | null> {
    const rows = await this.database
      .update(studySessions)
      .set({
        currentReelPosition,
        furthestReelPosition: sql<number>`max(${studySessions.furthestReelPosition}, ${currentReelPosition})`,
        lastActiveAt,
      })
      .where(and(eq(studySessions.id, sessionId), isNull(studySessions.completedAt)))
      .returning({
        currentReelPosition: studySessions.currentReelPosition,
        furthestReelPosition: studySessions.furthestReelPosition,
      });
    return rows[0] ?? null;
  }

  private toModel(row: typeof studySessions.$inferSelect): StudySession {
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
}
