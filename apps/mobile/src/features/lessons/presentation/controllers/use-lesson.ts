import { useQuery } from "@tanstack/react-query";

import type { LessonId } from "@/features/lessons/domain/lesson.model";

import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { lessonQueries } from "@/features/lessons/presentation/queries/lesson-queries";

type LessonOptions = Readonly<{ lessonId: LessonId | null }>;

export function useLesson({ lessonId }: LessonOptions) {
  const { data, isPending } = useQuery(lessonQueries.detail(useLessonsCapability(), lessonId));

  return { lesson: data ?? null, loading: lessonId !== null && isPending };
}
