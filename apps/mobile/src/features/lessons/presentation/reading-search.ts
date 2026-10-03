import type { DeckReadingList, LessonSummary } from "@/features/lessons/domain/lesson.model";

import { matchesLessonSearch } from "@/features/lessons/presentation/lesson-search";
import { matchesSearchText } from "@/shared/presentation/text-search";

export type ReadingSearchResult = Readonly<{
  readingList: DeckReadingList;
  /** The lessons the deck's card previews: all of them, or only those matching the search. */
  lessons: readonly LessonSummary[];
  /** True when only some lessons matched, so the deck's own screen should open filtered. */
  matchedLessonsOnly: boolean;
}>;

/**
 * Decks on the Reading tab narrowed to a search. A deck whose title matches keeps all its
 * lessons; otherwise it stays when any lesson title matches, previewing only those lessons.
 */
export function searchReadingLists(
  readingLists: readonly DeckReadingList[],
  query: string
): ReadingSearchResult[] {
  return readingLists.flatMap((readingList): ReadingSearchResult[] => {
    if (matchesSearchText(query, readingList.deckTitle)) {
      return [{ readingList, lessons: readingList.lessons, matchedLessonsOnly: false }];
    }
    const lessons = readingList.lessons.filter((lesson) => matchesLessonSearch(lesson, query));
    return lessons.length > 0 ? [{ readingList, lessons, matchedLessonsOnly: true }] : [];
  });
}
