import { useEffect, useState } from "react";

import type { DeckReadingList } from "@/features/lessons/domain/lesson.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { toOperationError } from "@/shared/errors/normalize-error";

type ReadingListsState = Readonly<{
  readingLists: readonly DeckReadingList[];
  loading: boolean;
}>;

type LoadedReadingListsState = Readonly<{
  readingLists: readonly DeckReadingList[];
  error: Error | null;
  revision: number | null;
}>;

const loadingState: ReadingListsState = { loading: true, readingLists: [] };

export function useReadingLists(): ReadingListsState {
  const { lessonService } = useLessonsCapability();
  const { revision } = useDeckContentRevision();
  const [state, setState] = useState<LoadedReadingListsState>({
    error: null,
    readingLists: [],
    revision: null,
  });

  useEffect(
    function loadReadingLists() {
      let active = true;

      const load = async () => {
        try {
          const readingLists = await lessonService.listReadingLists();
          if (active) {
            setState({ error: null, readingLists, revision });
          }
        } catch (error) {
          if (active) {
            setState({
              error: toOperationError(error, {
                code: "VIEW_LOAD_FAILED",
                context: { operation: "lessons.list" },
                message: "Could not load lessons",
              }),
              readingLists: [],
              revision,
            });
          }
        }
      };

      void load();
      return function cancelReadingListLoad() {
        active = false;
      };
    },
    [lessonService, revision]
  );

  // Gate during render: replacement effects have not run yet when deck content changes.
  if (state.revision !== revision) {
    return loadingState;
  }
  if (state.error) {
    throw state.error;
  }
  return { loading: false, readingLists: state.readingLists };
}
