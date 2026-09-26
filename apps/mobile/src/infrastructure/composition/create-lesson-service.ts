import type { LessonService } from "@/features/lessons/domain/lesson.service";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { LessonServiceImpl } from "@/features/lessons/application/lesson.service.impl";
import { SQLiteLessonRepository } from "@/features/lessons/infrastructure/sqlite-lesson.repository";
import { SQLiteReadingListQuery } from "@/features/lessons/infrastructure/sqlite-reading-list.query";

export function createLessonService(database: DrizzleDatabase): LessonService {
  return new LessonServiceImpl(
    new SQLiteLessonRepository(database),
    new SQLiteReadingListQuery(database)
  );
}
