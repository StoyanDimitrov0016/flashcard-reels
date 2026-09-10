import { and, desc, eq, isNull } from "drizzle-orm";

import { FOCUS_SESSION_INACTIVITY_TIMEOUT_MS } from "@/features/study/domain/review-attempts";
import type { DeckId } from "@/features/decks/domain/deck.model";
import { StudySession, type StudySessionScope } from "@/features/study/domain/study-session.model";
import { StudySessionScopeSchema } from "@/features/study/contracts/study-session.schema";
import type {
  OpenStudySessionResult,
  StudySessionLifecycleTransaction,
} from "@/features/study/application/study-session-lifecycle-transaction";
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
        (replaceExisting || (scope === "focused" && (activeRow.deckId !== deckId || focusExpired)));

      if (activeRow && !shouldReplace) {
        transaction
          .update(studySessions)
          .set({ currentReelPosition: activeRow.currentReelPosition, lastActiveAt: now })
          .where(and(eq(studySessions.id, activeRow.id), isNull(studySessions.completedAt)))
          .run();
        return {
          created: false,
          replacedSessionId: null,
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
        aggregatedThroughReelPosition: -1,
        createdAt: now,
        currentReelPosition: 0,
        deckId,
        id: sessionId,
        lastActiveAt: now,
        scope,
        feedState: "{}",
      });
      transaction
        .insert(studySessions)
        .values({
          aggregatedThroughReelPosition: session.aggregatedThroughReelPosition,
          completedAt: session.completedAt,
          createdAt: session.createdAt,
          currentReelPosition: session.currentReelPosition,
          deckId: session.deckId,
          id: session.id,
          lastActiveAt: session.lastActiveAt,
          scope: session.scope,
          feedState: session.feedState,
        })
        .run();
      return { created: true, replacedSessionId: activeRow?.id ?? null, session };
    });
  }

  private toModel(row: typeof studySessions.$inferSelect): StudySession {
    return new StudySession({
      completedAt: row.completedAt,
      aggregatedThroughReelPosition: row.aggregatedThroughReelPosition,
      createdAt: row.createdAt,
      currentReelPosition: row.currentReelPosition,
      deckId: row.deckId,
      id: row.id,
      lastActiveAt: row.lastActiveAt,
      scope: StudySessionScopeSchema.parse(row.scope),
      feedState: row.feedState,
    });
  }
}
