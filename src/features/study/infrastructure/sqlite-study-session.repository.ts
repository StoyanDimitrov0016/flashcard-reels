import { and, desc, eq, isNull } from "drizzle-orm";

import { type DeckId } from "@/features/decks/domain/deck.model";
import {
  StudySession,
  StudySessionScopeSchema,
  type StudySessionScope,
} from "@/features/study/domain/study-session.model";
import { StudySessionStrategySchema } from "@/features/study/domain/study-session-strategy";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { studySessions } from "@/infrastructure/sqlite/schema";

export class SQLiteStudySessionRepository<TRunResult = unknown> implements StudySessionRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async completeActiveByScope(scope: StudySessionScope, completedAt: string): Promise<void> {
    await this.database
      .update(studySessions)
      .set({ completedAt })
      .where(and(eq(studySessions.scope, scope), isNull(studySessions.completedAt)));
  }

  async complete(sessionId: string, completedAt: string): Promise<void> {
    await this.database
      .update(studySessions)
      .set({ completedAt })
      .where(and(eq(studySessions.id, sessionId), isNull(studySessions.completedAt)));
  }

  async create(session: StudySession): Promise<void> {
    await this.database.insert(studySessions).values({
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      currentReelPosition: session.currentReelPosition,
      deckId: session.deckId,
      id: session.id,
      lastActiveAt: session.lastActiveAt,
      scope: session.scope,
      strategy: session.strategy,
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

  async updateCurrentReelPosition(
    sessionId: string,
    currentReelPosition: number,
    lastActiveAt: string
  ): Promise<boolean> {
    const rows = await this.database
      .update(studySessions)
      .set({ currentReelPosition, lastActiveAt })
      .where(and(eq(studySessions.id, sessionId), isNull(studySessions.completedAt)))
      .returning({ id: studySessions.id });
    return rows.length > 0;
  }

  private toModel(row: typeof studySessions.$inferSelect): StudySession {
    return new StudySession({
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      currentReelPosition: row.currentReelPosition,
      deckId: row.deckId,
      id: row.id,
      lastActiveAt: row.lastActiveAt,
      scope: StudySessionScopeSchema.parse(row.scope),
      strategy: StudySessionStrategySchema.parse(row.strategy),
    });
  }
}
