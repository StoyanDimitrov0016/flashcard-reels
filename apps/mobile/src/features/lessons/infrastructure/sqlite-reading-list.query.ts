import { asc, eq } from "drizzle-orm";

import type { DeckReadingList, LessonSummary } from "@/features/lessons/domain/lesson.model";
import type { ReadingListQuery } from "@/features/lessons/domain/reading-list.query";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";

import { decks, lessons } from "@/infrastructure/sqlite/schema";

export class SQLiteReadingListQuery<TRunResult = unknown> implements ReadingListQuery {
  private readonly database: DrizzleDatabase<TRunResult>;

  constructor(database: DrizzleDatabase<TRunResult>) {
    this.database = database;
  }

  async listReadingLists(): Promise<DeckReadingList[]> {
    // Lessons stay readable while a reinstalled deck waits for its saved-progress choice.
    const rows = await this.database
      .select({
        deckId: decks.id,
        deckTitle: decks.title,
        lessonId: lessons.id,
        lessonOrder: lessons.order,
        lessonTitle: lessons.title,
      })
      .from(lessons)
      .innerJoin(decks, eq(decks.id, lessons.deckId))
      .orderBy(asc(decks.title), asc(decks.id), asc(lessons.order));

    const readingLists: { deckId: string; deckTitle: string; lessons: LessonSummary[] }[] = [];
    for (const row of rows) {
      let readingList = readingLists.at(-1);
      if (readingList?.deckId !== row.deckId) {
        readingList = { deckId: row.deckId, deckTitle: row.deckTitle, lessons: [] };
        readingLists.push(readingList);
      }
      readingList.lessons.push({
        id: row.lessonId,
        order: row.lessonOrder,
        title: row.lessonTitle,
      });
    }
    return readingLists;
  }
}
