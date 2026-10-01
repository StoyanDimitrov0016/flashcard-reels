import { useCallback } from "react";

import type { DeckReadingList } from "@/features/lessons/domain/lesson.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { toOperationError } from "@/shared/errors/normalize-error";
import { useAsyncLoad } from "@/shared/presentation/hooks/use-async-load";
const emptyLists: readonly DeckReadingList[] = [];
function readingFailure(error: unknown) {
  return toOperationError(error, {
    code: "VIEW_LOAD_FAILED",
    context: { operation: "lessons.list" },
    message: "Could not load lessons",
  });
}
export function useReadingLists() {
  const { lessonService } = useLessonsCapability();
  const { revision } = useDeckContentRevision();
  const load = useCallback(
    (_revision = revision) => lessonService.listReadingLists(),
    [lessonService, revision]
  );
  const state = useAsyncLoad({
    load,
    initialData: emptyLists,
    onError: readingFailure,
    gate: true,
  });
  if (state.error) {
    throw state.error;
  }

  return { readingLists: state.data, loading: state.loading };
}
