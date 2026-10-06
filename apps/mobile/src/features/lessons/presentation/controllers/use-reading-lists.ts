import { useQuery } from "@tanstack/react-query";

import type { DeckReadingList } from "@/features/lessons/domain/lesson.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { lessonQueries } from "@/features/lessons/presentation/queries/lesson-queries";
import { toOperationError } from "@/shared/errors/normalize-error";

const emptyLists: readonly DeckReadingList[] = [];

export function useReadingLists() {
  const { lessonService } = useLessonsCapability();
  const { revision } = useDeckContentRevision();
  const { data, error, isPending } = useQuery(lessonQueries.readingLists(lessonService, revision));
  if (error) {
    throw toOperationError(error, {
      code: "VIEW_LOAD_FAILED",
      context: { operation: "lessons.list" },
      message: "Could not load lessons",
    });
  }

  return { readingLists: data ?? emptyLists, loading: isPending };
}
