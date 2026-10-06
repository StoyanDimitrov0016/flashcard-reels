import { queryOptions, skipToken } from "@tanstack/react-query";

import type { LessonId } from "@/features/lessons/domain/lesson.model";
import type { LessonService } from "@/features/lessons/domain/lesson.service";

type LessonDetailOptions = Readonly<{
  lessonService: LessonService;
  lessonId: LessonId | null;
  contentRevision: number;
}>;

/** Lesson reads. Keys carry the deck content revision until revisions become query invalidation. */
export const lessonQueries = {
  readingLists: (lessonService: LessonService, contentRevision: number) =>
    queryOptions({
      queryKey: ["lessons", "reading-lists", contentRevision],
      queryFn: () => lessonService.listReadingLists(),
    }),
  detail: ({ lessonService, lessonId, contentRevision }: LessonDetailOptions) =>
    queryOptions({
      queryKey: ["lessons", "detail", lessonId, contentRevision],
      queryFn: lessonId === null ? skipToken : () => lessonService.findById(lessonId),
    }),
};
