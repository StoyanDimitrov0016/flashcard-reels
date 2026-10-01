import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { matchesSearchText } from "@/shared/presentation/text-search";

/** Lesson lists carry titles only, so a lesson matches by its title. */
export function matchesLessonSearch(lesson: Pick<LessonSummary, "title">, query: string): boolean {
  return matchesSearchText(query, lesson.title);
}
