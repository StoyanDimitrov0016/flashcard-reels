import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import { useFocusedFeedLifecycle } from "@/features/reels/presentation/hooks/use-focused-feed-lifecycle";
import {
  confirmFocusedFeedSession,
  createFocusedFeedState,
  reconcileFocusedFeedState,
  type FocusedFeedState,
} from "@/features/reels/presentation/focused-feed-state";
import type { FocusedFeedOptions } from "@/features/reels/presentation/open-focused-feed";

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
  confirmFocusedFeedSession: (sessionId: string) => void;
}>;

const FeedScopeContext = createContext<FeedScopeContextValue | null>(null);

type FeedScopeProviderProps = Readonly<{ children: ReactNode }>;

export function FeedScopeProvider({ children }: FeedScopeProviderProps) {
  const [focusedFeed, setFocusedFeed] = useState<FocusedFeedState>({ status: "empty" });
  const focusLifecycle = useFocusedFeedLifecycle();

  useEffect(
    function reconcileFocusedFeedLifecycle() {
      if (!focusLifecycle.resolved) {
        return;
      }
      const session = focusLifecycle.session;
      const persistedSession =
        !session || session.deckId === null ? null : { deckId: session.deckId, id: session.id };
      // The lifecycle hook is an external AppState-backed source, so reconciliation belongs here.
      // oxlint-disable-next-line react/set-state-in-effect
      setFocusedFeed((currentFeed) => reconcileFocusedFeedState(currentFeed, persistedSession));
    },
    [focusLifecycle.resolved, focusLifecycle.revision, focusLifecycle.session]
  );

  const startFocusedFeed = useCallback(
    (deckId: DeckId, anchorFlashcardId?: string, options?: FocusedFeedOptions) => {
      setFocusedFeed((currentFeed) =>
        createFocusedFeedState(currentFeed, deckId, anchorFlashcardId, options)
      );
    },
    []
  );

  const confirmSession = useCallback((sessionId: string) => {
    setFocusedFeed((currentFeed) => confirmFocusedFeedSession(currentFeed, sessionId));
  }, []);

  const contextValue = {
    confirmFocusedFeedSession: confirmSession,
    focusedFeed,
    focusRestoring: !focusLifecycle.resolved,
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
