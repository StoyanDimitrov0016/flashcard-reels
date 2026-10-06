import { queryOptions, skipToken } from "@tanstack/react-query";

import type { LessonId } from "@/features/lessons/domain/lesson.model";
import type { LessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";

import { loadViewData } from "@/shared/presentation/query/load-view-data";
import { queryScopes } from "@/shared/presentation/query/query-scopes";

/** Lesson reads. `services` are stable dependencies; every other input is part of the key. */
export const lessonQueries = {
  readingLists: (services: LessonsCapability) =>
    queryOptions({
      queryKey: [...queryScopes.lessons, "reading-lists"],
      queryFn: () =>
        loadViewData({ operation: "lessons.list", message: "Could not load lessons" }, () =>
          services.lessonService.listReadingLists()
        ),
    }),
  detail: (services: LessonsCapability, lessonId: LessonId | null) =>
    queryOptions({
      queryKey: [...queryScopes.lessons, "detail", lessonId],
      queryFn:
        lessonId === null
          ? skipToken
          : () =>
              loadViewData(
                {
                  operation: "lessons.load",
                  message: "Could not load this lesson",
                  context: { lessonId },
                },
                () => services.lessonService.findById(lessonId)
              ),
    }),
};
