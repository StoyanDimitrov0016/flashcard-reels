import { useQuery } from "@tanstack/react-query";

import type { LessonId } from "@/features/lessons/domain/lesson.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { lessonQueries } from "@/features/lessons/presentation/queries/lesson-queries";
import { toOperationError } from "@/shared/errors/normalize-error";

type LessonOptions = Readonly<{ lessonId: LessonId | null }>;

export function useLesson({ lessonId }: LessonOptions) {
  const { lessonService } = useLessonsCapability();
  const { revision } = useDeckContentRevision();
  const { data, error, isPending } = useQuery(
    lessonQueries.detail({ lessonService, lessonId, contentRevision: revision })
  );
  if (lessonId === null) {
    return { lesson: null, loading: false };
  }
  if (error) {
    throw toOperationError(error, {
      code: "VIEW_LOAD_FAILED",
      context: { lessonId, operation: "lessons.load" },
      message: "Could not load this lesson",
    });
  }

  return { lesson: data ?? null, loading: isPending };
}
