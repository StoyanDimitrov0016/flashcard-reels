import { useCallback } from "react";

import type { Lesson, LessonId } from "@/features/lessons/domain/lesson.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { toOperationError } from "@/shared/errors/normalize-error";
import { useAsyncLoad } from "@/shared/presentation/hooks/use-async-load";
type LessonOptions = Readonly<{ lessonId: LessonId | null }>;
export function useLesson({ lessonId }: LessonOptions) {
  const { lessonService } = useLessonsCapability();
  const { revision } = useDeckContentRevision();
  const load = useCallback(
    async (_revision = revision): Promise<Lesson | null> => {
      if (lessonId === null) {
        return null;
      }
      return lessonService.findById(lessonId);
    },
    [lessonId, lessonService, revision]
  );
  const onError = useCallback(
    (error: unknown) =>
      toOperationError(error, {
        code: "VIEW_LOAD_FAILED",
        context: { lessonId, operation: "lessons.load" },
        message: "Could not load this lesson",
      }),
    [lessonId]
  );
  const state = useAsyncLoad({
    load,
    initialData: null,
    onError,
    enabled: lessonId !== null,
    gate: true,
  });
  if (lessonId === null) {
    return { lesson: null, loading: false };
  }
  if (state.error) {
    throw state.error;
  }

  return { lesson: state.data, loading: state.loading };
}
