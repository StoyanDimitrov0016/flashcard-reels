import { and, desc, eq, isNull } from "drizzle-orm";

import { FOCUS_SESSION_INACTIVITY_TIMEOUT_MS } from "@/features/study/config/review-attempts";
import type { DeckId } from "@/features/decks/domain/deck.model";
import {
  StudySession,
  StudySessionScopeSchema,
  type StudySessionScope,
} from "@/features/study/domain/study-session.model";
import {
  StudySessionStrategySchema,
  type StudySessionStrategy,
} from "@/features/study/domain/study-session-strategy";
import type {
  OpenStudySessionResult,
  StudySessionLifecycleTransaction,
} from "@/features/study/services/study-session-lifecycle-transaction";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import { studySessions } from "@/infrastructure/sqlite/schema";

export class SQLiteStudySessionLifecycleTransaction<
  TRunResult = unknown,
> implements StudySessionLifecycleTransaction {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async open(
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExisting: boolean,
    strategy: StudySessionStrategy,
    now: string,
    sessionId: string
  ): Promise<OpenStudySessionResult> {
    return this.database.transaction((transaction) => {
      const activeRows = transaction
        .select()
        .from(studySessions)
        .where(and(eq(studySessions.scope, scope), isNull(studySessions.completedAt)))
        .orderBy(desc(studySessions.createdAt), desc(studySessions.id))
        .limit(1)
        .all();
      const activeRow = activeRows[0];
      const focusExpired =
        activeRow &&
        scope === "focused" &&
        Date.parse(now) - Date.parse(activeRow.lastActiveAt) >= FOCUS_SESSION_INACTIVITY_TIMEOUT_MS;
      const shouldReplace =
        activeRow &&
        (replaceExisting ||
          (scope === "focused" &&
            (activeRow.deckId !== deckId || activeRow.strategy !== strategy || focusExpired)));

      if (activeRow && !shouldReplace) {
        transaction
          .update(studySessions)
          .set({ currentReelPosition: activeRow.currentReelPosition, lastActiveAt: now })
          .where(and(eq(studySessions.id, activeRow.id), isNull(studySessions.completedAt)))
          .run();
        return {
          created: false,
          session: this.toModel({ ...activeRow, lastActiveAt: now }),
        };
      }

      if (activeRow) {
        transaction
          .update(studySessions)
          .set({ completedAt: now })
          .where(and(eq(studySessions.id, activeRow.id), isNull(studySessions.completedAt)))
          .run();
      }

      const session = new StudySession({
        completedAt: null,
        compactedThroughReelPosition: -1,
        createdAt: now,
        currentReelPosition: 0,
        deckId,
        id: sessionId,
        lastActiveAt: now,
        scope,
        strategy,
        strategyState: "{}",
      });
      transaction
        .insert(studySessions)
        .values({
          compactedThroughReelPosition: session.compactedThroughReelPosition,
          completedAt: session.completedAt,
          createdAt: session.createdAt,
          currentReelPosition: session.currentReelPosition,
          deckId: session.deckId,
          id: session.id,
          lastActiveAt: session.lastActiveAt,
          scope: session.scope,
          strategy: session.strategy,
          strategyState: session.strategyState,
        })
        .run();
      return { created: true, session };
    });
  }

  private toModel(row: typeof studySessions.$inferSelect): StudySession {
    return new StudySession({
      completedAt: row.completedAt,
      compactedThroughReelPosition: row.compactedThroughReelPosition,
      createdAt: row.createdAt,
      currentReelPosition: row.currentReelPosition,
      deckId: row.deckId,
      id: row.id,
      lastActiveAt: row.lastActiveAt,
      scope: StudySessionScopeSchema.parse(row.scope),
      strategy: StudySessionStrategySchema.parse(row.strategy),
      strategyState: row.strategyState,
    });
  }
}
