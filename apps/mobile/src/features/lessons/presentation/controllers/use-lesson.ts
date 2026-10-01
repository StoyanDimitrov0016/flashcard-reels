import { parseLessonDocument, type LessonSection } from "@flashcard-reels/deck-contract";
import { useCallback } from "react";

import type { LessonBlock } from "@/features/lessons/domain/lesson-markdown.parser";
import type { Lesson, LessonId } from "@/features/lessons/domain/lesson.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { toOperationError } from "@/shared/errors/normalize-error";
import { useAsyncLoad } from "@/shared/presentation/hooks/use-async-load";
type LessonData = Readonly<{
  blocks: readonly LessonBlock[];
  sections: readonly LessonSection[];
  lesson: Lesson | null;
}>;
const emptyLesson: LessonData = { blocks: [], sections: [], lesson: null };
type LessonOptions = Readonly<{ lessonId: LessonId | null }>;
export function useLesson({ lessonId }: LessonOptions) {
  const { lessonService } = useLessonsCapability();
  const { revision } = useDeckContentRevision();
  const load = useCallback(
    async (_revision = revision) => {
      if (lessonId === null) {
        return emptyLesson;
      }
      const lesson = await lessonService.findById(lessonId);
      return lesson
        ? { ...parseLessonDocument(lesson.content, lesson.title), lesson }
        : emptyLesson;
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
    initialData: emptyLesson,
    onError,
    enabled: lessonId !== null,
    gate: true,
  });
  if (lessonId === null) {
    return { ...emptyLesson, loading: false };
  }
  if (state.error) {
    throw state.error;
  }

  return { ...state.data, loading: state.loading };
}
