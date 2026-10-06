import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext, useReducer } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { FocusedFeedOptions } from "@/features/reels/presentation/open-focused-feed";

import {
  useFocusedFeedLifecycle,
  type FocusedFeedEvaluation,
} from "@/features/reels/presentation/controllers/use-focused-feed-lifecycle";
import {
  confirmFocusedFeedSession,
  createFocusedFeedState,
  reconcileFocusedFeedState,
  type FocusedFeedState,
  type PersistedFocusedSession,
} from "@/features/reels/presentation/focused-feed-state";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";
import { queryScopes } from "@/shared/presentation/query/query-scopes";

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
    anchorFlashcardId: string | null,
    options?: FocusedFeedOptions
  ) => void;
  confirmFocusedFeedSession: (sessionId: string, expectedRevision: number) => void;
}>;

type FeedScopeOwnerState = Readonly<{
  focusedFeed: FocusedFeedState;
  lifecycleResolved: boolean;
  restorationError: Error | null;
}>;

type FeedScopeEvent =
  | Readonly<{
      session: PersistedFocusedSession | null;
      requestedDeckAvailable: boolean;
      type: "lifecycle";
    }>
  | Readonly<{ error: Error; type: "lifecycle-failed" }>
  | Readonly<{ type: "retry-lifecycle" }>
  | Readonly<{
      anchorFlashcardId: string | null;
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
};

function reduceFeedScope(state: FeedScopeOwnerState, event: FeedScopeEvent): FeedScopeOwnerState {
  if (event.type === "lifecycle") {
    return {
      focusedFeed: event.requestedDeckAvailable
        ? reconcileFocusedFeedState(state.focusedFeed, event.session)
        : { status: "empty", revision: state.focusedFeed.revision + 1 },
      lifecycleResolved: true,
      restorationError: null,
    };
  }
  if (event.type === "lifecycle-failed") {
    return { ...state, lifecycleResolved: true, restorationError: event.error };
  }
  if (event.type === "retry-lifecycle") {
    return { ...state, lifecycleResolved: false, restorationError: null };
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
  const queryClient = useQueryClient();
  const handleLifecycleEvaluation = useCallback(
    ({ session, requestedDeckAvailable }: FocusedFeedEvaluation) => {
      dispatch({
        session:
          !session || session.deckId === null ? null : { deckId: session.deckId, id: session.id },
        type: "lifecycle",
        requestedDeckAvailable,
      });
    },
    []
  );
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
  const focusedFeedLifecycle = useFocusedFeedLifecycle(
    handleLifecycleEvaluation,
    handleLifecycleFailure,
    ownerState.focusedFeed.status === "ready" ? ownerState.focusedFeed.deckId : null
  );
  const retryFocusedFeedRestoration = () => {
    dispatch({ type: "retry-lifecycle" });
    focusedFeedLifecycle.retry();
  };

  const startFocusedFeed = useCallback(
    (deckId: DeckId, anchorFlashcardId: string | null, options?: FocusedFeedOptions) => {
      // Only the latest start can still be showing, so earlier starts' feeds are released.
      queryClient.removeQueries({ queryKey: queryScopes.focusStartFeeds });
      dispatch({ anchorFlashcardId, deckId, options, type: "start" });
    },
    [queryClient]
  );
  const confirmSession = useCallback((sessionId: string, expectedRevision: number) => {
    dispatch({ expectedRevision, sessionId, type: "confirm" });
  }, []);

  const contextValue = {
    confirmFocusedFeedSession: confirmSession,
    focusedFeed: ownerState.focusedFeed,
    focusRestoring: !ownerState.lifecycleResolved || focusedFeedLifecycle.evaluating,
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
