import type { SQLiteDatabase } from "expo-sqlite";
import { z } from "zod";

import { DeckIdSchema, type DeckId } from "@/features/decks/domain/deck.model";
import {
  StudySession,
  StudySessionScopeSchema,
  type StudySessionScope,
} from "@/features/study/domain/study-session.model";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";

const StudySessionRowSchema = z.compile(
  z.object({
    completed_at: z.string().nullable(),
    created_at: z.string(),
    current_position: z.number().int().nonnegative(),
    deck_id: DeckIdSchema.nullable(),
    id: z.string(),
    mode: StudySessionScopeSchema,
  })
);
type StudySessionRow = z.infer<typeof StudySessionRowSchema>;

export class SQLiteStudySessionRepository implements StudySessionRepository {
  private readonly database: SQLiteDatabase;

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  async completeActiveByScope(scope: StudySessionScope, completedAt: string): Promise<void> {
    await this.database.runAsync(
      "UPDATE study_sessions SET completed_at = ? WHERE mode = ? AND completed_at IS NULL",
      completedAt,
      scope
    );
  }

  async complete(sessionId: string, completedAt: string): Promise<void> {
    await this.database.runAsync(
      "UPDATE study_sessions SET completed_at = ? WHERE id = ? AND completed_at IS NULL",
      completedAt,
      sessionId
    );
  }

  async create(session: StudySession): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO study_sessions
        (id, mode, deck_id, current_position, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      session.id,
      session.scope,
      session.deckId,
      session.currentPosition,
      session.createdAt,
      session.completedAt
    );
  }

  async findActive(scope: StudySessionScope, deckId: DeckId | null): Promise<StudySession | null> {
    const row =
      deckId === null
        ? await this.database.getFirstAsync<unknown>(
            `SELECT id, mode, deck_id, current_position, created_at, completed_at
             FROM study_sessions
             WHERE mode = ? AND deck_id IS NULL AND completed_at IS NULL
             ORDER BY created_at DESC, id DESC
             LIMIT 1`,
            scope
          )
        : await this.database.getFirstAsync<unknown>(
            `SELECT id, mode, deck_id, current_position, created_at, completed_at
             FROM study_sessions
             WHERE mode = ? AND deck_id = ? AND completed_at IS NULL
             ORDER BY created_at DESC, id DESC
             LIMIT 1`,
            scope,
            deckId
          );
    return row ? this.toModel(StudySessionRowSchema.parse(row)) : null;
  }

  async updateCurrentPosition(sessionId: string, currentPosition: number): Promise<boolean> {
    const result = await this.database.runAsync(
      "UPDATE study_sessions SET current_position = ? WHERE id = ? AND completed_at IS NULL",
      currentPosition,
      sessionId
    );
    return result.changes > 0;
  }

  private toModel(row: StudySessionRow): StudySession {
    return new StudySession({
      completedAt: row.completed_at,
      createdAt: row.created_at,
      currentPosition: row.current_position,
      deckId: row.deck_id,
      id: row.id,
      scope: row.mode,
    });
  }
}
