import type { SQLiteDatabase } from "expo-sqlite";

import type { StudySession } from "@/features/study/domain/study-session.model";
import type { StudySessionRepository } from "@/features/study/domain/study-session.repository";

export class SQLiteStudySessionRepository implements StudySessionRepository {
  private readonly database: SQLiteDatabase;

  constructor(database: SQLiteDatabase) {
    this.database = database;
  }

  async completeOpenSessions(completedAt: string): Promise<void> {
    await this.database.runAsync(
      "UPDATE study_sessions SET completed_at = ? WHERE completed_at IS NULL",
      completedAt
    );
  }

  async create(session: StudySession): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO study_sessions
        (id, mode, deck_id, current_position, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      session.id,
      session.mode,
      session.deckId,
      session.currentPosition,
      session.createdAt,
      session.completedAt
    );
  }

  async updateCurrentPosition(sessionId: string, currentPosition: number): Promise<boolean> {
    const result = await this.database.runAsync(
      "UPDATE study_sessions SET current_position = ? WHERE id = ? AND completed_at IS NULL",
      currentPosition,
      sessionId
    );
    return result.changes > 0;
  }
}
