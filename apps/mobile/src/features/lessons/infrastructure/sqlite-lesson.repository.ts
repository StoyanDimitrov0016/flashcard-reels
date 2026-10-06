import { asc, eq } from "drizzle-orm";

import type { LessonRepository } from "@/features/lessons/domain/lesson.repository";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { Lesson, type LessonId } from "@/features/lessons/domain/lesson.model";
import { lessons, lessonSections } from "@/infrastructure/sqlite/schema";

export class SQLiteLessonRepository<TRunResult = unknown> implements LessonRepository {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async findById(id: LessonId): Promise<Lesson | null> {
    const rows = await this.database
      .select({
        lesson: lessons,
        section: { id: lessonSections.id, title: lessonSections.title, body: lessonSections.body },
      })
      .from(lessons)
      .leftJoin(lessonSections, eq(lessons.id, lessonSections.lessonId))
      .where(eq(lessons.id, id))
      .orderBy(asc(lessonSections.order));
    const row = rows[0]?.lesson;
    return row
      ? new Lesson({
          intro: row.intro,
          sections: rows.flatMap((result) => (result.section ? [result.section] : [])),
          deckId: row.deckId,
          id: row.id,
          order: row.order,
          title: row.title,
        })
      : null;
  }
}
