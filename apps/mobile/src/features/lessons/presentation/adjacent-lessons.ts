import type { LessonId, LessonSummary } from "@/features/lessons/domain/lesson.model";

export type AdjacentLessons = Readonly<{
  previous: LessonSummary | undefined;
  next: LessonSummary | undefined;
}>;

/** The lessons before and after one lesson in its deck's reading order. */
export function findAdjacentLessons(
  lessons: readonly LessonSummary[],
  lessonId: LessonId | null | undefined
): AdjacentLessons {
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index === -1) {
    return { previous: undefined, next: undefined };
  }
  return { previous: lessons[index - 1], next: lessons[index + 1] };
}
