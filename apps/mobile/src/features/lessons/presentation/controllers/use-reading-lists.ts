import { useQuery } from "@tanstack/react-query";

import type { DeckReadingList } from "@/features/lessons/domain/lesson.model";

import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { lessonQueries } from "@/features/lessons/presentation/queries/lesson-queries";

const emptyLists: readonly DeckReadingList[] = [];

export function useReadingLists() {
  const { data, isPending } = useQuery(lessonQueries.readingLists(useLessonsCapability()));

  return { readingLists: data ?? emptyLists, loading: isPending };
}
