import { useQuery } from "@tanstack/react-query";

import type { LessonId } from "@/features/lessons/domain/lesson.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { lessonQueries } from "@/features/lessons/presentation/queries/lesson-queries";

type LessonOptions = Readonly<{ lessonId: LessonId | null }>;

export function useLesson({ lessonId }: LessonOptions) {
  const { revision } = useDeckContentRevision();
  const { data, isPending } = useQuery(
    lessonQueries.detail(useLessonsCapability(), lessonId, revision)
  );

  return { lesson: data ?? null, loading: lessonId !== null && isPending };
}
