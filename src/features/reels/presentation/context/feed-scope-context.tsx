import { createContext, type ReactNode, useCallback, useContext, useReducer } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import {
  confirmFocusedFeedSession,
  createFocusedFeedState,
  reconcileFocusedFeedState,
  type FocusedFeedState,
  type PersistedFocusedSession,
} from "@/features/reels/presentation/focused-feed-state";
import { useFocusedFeedLifecycle } from "@/features/reels/presentation/hooks/use-focused-feed-lifecycle";
import type { FocusedFeedOptions } from "@/features/reels/presentation/open-focused-feed";
import type { StudySession } from "@/features/study/domain/study-session.model";

export type {
  FocusTransition,
  FocusedFeedState,
} from "@/features/reels/presentation/focused-feed-state";

type FeedScopeContextValue = Readonly<{
  focusedFeed: FocusedFeedState;
  focusRestoring: boolean;
  startFocusedFeed: (
    deckId: DeckId,
    anchorFlashcardId?: string,
    options?: FocusedFeedOptions
  ) => void;
  confirmFocusedFeedSession: (sessionId: string, expectedRevision: number) => void;
}>;

type FeedScopeOwnerState = Readonly<{
  focusedFeed: FocusedFeedState;
  lifecycleResolved: boolean;
}>;

type FeedScopeEvent =
  | Readonly<{ session: PersistedFocusedSession | null; type: "lifecycle" }>
  | Readonly<{
      anchorFlashcardId?: string;
      deckId: DeckId;
      options?: FocusedFeedOptions;
      type: "start";
    }>
  | Readonly<{ expectedRevision: number; sessionId: string; type: "confirm" }>;

const FeedScopeContext = createContext<FeedScopeContextValue | null>(null);
const initialOwnerState: FeedScopeOwnerState = {
  focusedFeed: { revision: 0, status: "empty" },
  lifecycleResolved: false,
};

function reduceFeedScope(state: FeedScopeOwnerState, event: FeedScopeEvent): FeedScopeOwnerState {
  if (event.type === "lifecycle") {
    return {
      focusedFeed: reconcileFocusedFeedState(state.focusedFeed, event.session),
      lifecycleResolved: true,
    };
  }
  if (event.type === "start") {
    return {
      ...state,
      focusedFeed: createFocusedFeedState(
        state.focusedFeed,
        event.deckId,
        event.anchorFlashcardId,
        event.options
      ),
    };
  }
  return {
    ...state,
    focusedFeed: confirmFocusedFeedSession(
      state.focusedFeed,
      event.sessionId,
      event.expectedRevision
    ),
  };
}

type FeedScopeProviderProps = Readonly<{ children: ReactNode }>;

export function FeedScopeProvider({ children }: FeedScopeProviderProps) {
  const [ownerState, dispatch] = useReducer(reduceFeedScope, initialOwnerState);
  const handleLifecycleEvaluation = useCallback((session: StudySession | null) => {
    dispatch({
      session:
        !session || session.deckId === null ? null : { deckId: session.deckId, id: session.id },
      type: "lifecycle",
    });
  }, []);
  useFocusedFeedLifecycle(handleLifecycleEvaluation);

  const startFocusedFeed = useCallback(
    (deckId: DeckId, anchorFlashcardId?: string, options?: FocusedFeedOptions) => {
      dispatch({ anchorFlashcardId, deckId, options, type: "start" });
    },
    []
  );
  const confirmSession = useCallback((sessionId: string, expectedRevision: number) => {
    dispatch({ expectedRevision, sessionId, type: "confirm" });
  }, []);

  const contextValue = {
    confirmFocusedFeedSession: confirmSession,
    focusedFeed: ownerState.focusedFeed,
    focusRestoring: !ownerState.lifecycleResolved,
    startFocusedFeed,
  };

  return <FeedScopeContext.Provider value={contextValue}>{children}</FeedScopeContext.Provider>;
}

export function useFeedScope() {
  const context = useContext(FeedScopeContext);
  if (!context) {
    throw new Error("useFeedScope requires FeedScopeProvider");
  }
  return context;
}
