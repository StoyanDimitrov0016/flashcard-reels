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
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/presentation/errors/report-error";

export type {
  FocusTransition,
  FocusedFeedState,
} from "@/features/reels/presentation/focused-feed-state";

type FeedScopeContextValue = Readonly<{
  focusedFeed: FocusedFeedState;
  focusRestoring: boolean;
  restorationError: Error | null;
  retryFocusedFeedRestoration: () => void;
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
  restorationError: Error | null;
  retryKey: number;
}>;

type FeedScopeEvent =
  | Readonly<{ session: PersistedFocusedSession | null; type: "lifecycle" }>
  | Readonly<{ error: Error; type: "lifecycle-failed" }>
  | Readonly<{ type: "retry-lifecycle" }>
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
  restorationError: null,
  retryKey: 0,
};

function reduceFeedScope(state: FeedScopeOwnerState, event: FeedScopeEvent): FeedScopeOwnerState {
  if (event.type === "lifecycle") {
    return {
      focusedFeed: reconcileFocusedFeedState(state.focusedFeed, event.session),
      lifecycleResolved: true,
      restorationError: null,
      retryKey: state.retryKey,
    };
  }
  if (event.type === "lifecycle-failed") {
    return { ...state, lifecycleResolved: true, restorationError: event.error };
  }
  if (event.type === "retry-lifecycle") {
    return {
      ...state,
      lifecycleResolved: false,
      restorationError: null,
      retryKey: state.retryKey + 1,
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
  const handleLifecycleFailure = useCallback((error: unknown) => {
    const normalized = toOperationError(error, {
      code: "FOCUS_RESTORE_FAILED",
      context: { operation: "focused-feed.restore" },
      message: "The focused study session could not be restored",
    });
    reportError(normalized, "Focused-feed restoration failure");
    dispatch({
      error: normalized,
      type: "lifecycle-failed",
    });
  }, []);
  const retryFocusedFeedRestoration = useCallback(() => {
    dispatch({ type: "retry-lifecycle" });
  }, []);
  useFocusedFeedLifecycle(handleLifecycleEvaluation, handleLifecycleFailure, ownerState.retryKey);

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
    restorationError: ownerState.restorationError,
    retryFocusedFeedRestoration,
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
