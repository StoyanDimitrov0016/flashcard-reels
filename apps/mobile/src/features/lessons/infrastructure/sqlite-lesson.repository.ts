import { eq } from "drizzle-orm";

import type { LessonRepository } from "@/features/lessons/domain/lesson.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { Lesson, type LessonId } from "@/features/lessons/domain/lesson.model";
import { lessons } from "@/infrastructure/sqlite/schema";

export class SQLiteLessonRepository<TRunResult = unknown> implements LessonRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async findById(id: LessonId): Promise<Lesson | null> {
    const rows = await this.database.select().from(lessons).where(eq(lessons.id, id)).limit(1);
    const row = rows[0];
    return row
      ? new Lesson({
          content: row.content,
          deckId: row.deckId,
          id: row.id,
          order: row.order,
          title: row.title,
        })
      : null;
  }
}
