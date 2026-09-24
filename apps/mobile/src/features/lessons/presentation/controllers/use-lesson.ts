import { useEffect, useState } from "react";

import type { Lesson, LessonId } from "@/features/lessons/domain/lesson.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import {
  parseLessonMarkdown,
  type LessonBlock,
} from "@/features/lessons/domain/lesson-markdown.parser";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { toOperationError } from "@/shared/errors/normalize-error";

type LessonState = Readonly<{
  blocks: readonly LessonBlock[];
  lesson: Lesson | null;
  loading: boolean;
}>;

type LoadedLessonState = Readonly<{
  blocks: readonly LessonBlock[];
  error: Error | null;
  lesson: Lesson | null;
  lessonId: LessonId | null;
  revision: number | null;
}>;

const loadingState: LessonState = { blocks: [], lesson: null, loading: true };

type LessonOptions = Readonly<{ lessonId: LessonId }>;

export function useLesson({ lessonId }: LessonOptions): LessonState {
  const { lessonService } = useLessonsCapability();
  const { revision } = useDeckContentRevision();
  const [state, setState] = useState<LoadedLessonState>({
    blocks: [],
    error: null,
    lesson: null,
    lessonId: null,
    revision: null,
  });

  useEffect(
    function loadLesson() {
      let active = true;

      const load = async () => {
        try {
          const lesson = await lessonService.findById(lessonId);
          if (active) {
            const blocks = lesson ? parseLessonMarkdown(lesson.content) : [];
            setState({ blocks, error: null, lesson, lessonId, revision });
          }
        } catch (error) {
          if (active) {
            setState({
              blocks: [],
              error: toOperationError(error, {
                code: "VIEW_LOAD_FAILED",
                context: { lessonId, operation: "lessons.load" },
                message: "Could not load this lesson",
              }),
              lesson: null,
              lessonId,
              revision,
            });
          }
        }
      };

      void load();
      return function cancelLessonLoad() {
        active = false;
      };
    },
    [lessonId, lessonService, revision]
  );

  if (state.lessonId !== lessonId || state.revision !== revision) {
    return loadingState;
  }
  if (state.error) {
    throw state.error;
  }
  return { blocks: state.blocks, lesson: state.lesson, loading: false };
}
