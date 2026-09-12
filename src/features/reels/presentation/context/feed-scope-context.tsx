import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import { useFocusedFeedLifecycle } from "@/features/reels/presentation/hooks/use-focused-feed-lifecycle";
import {
  consumeFocusedFeedTransition as consumeFocusedFeedTransitionState,
  createFocusedFeedState,
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
  consumeFocusedFeedTransition: () => void;
}>;

const FeedScopeContext = createContext<FeedScopeContextValue | null>(null);

type FeedScopeProviderProps = Readonly<{ children: ReactNode }>;

export function FeedScopeProvider({ children }: FeedScopeProviderProps) {
  const [focusedFeed, setFocusedFeed] = useState<FocusedFeedState>({ status: "empty" });
  const focusLifecycle = useFocusedFeedLifecycle();
  const restoredFocusedFeed = useMemo(() => {
    const deckId = focusLifecycle.session?.deckId;
    return focusLifecycle.resolved && focusedFeed.status === "empty" && deckId
      ? {
          deckId,
          replaceSession: false,
          revision: 1,
          status: "ready" as const,
          transition: null,
        }
      : null;
  }, [focusedFeed.status, focusLifecycle.resolved, focusLifecycle.session?.deckId]);
  const visibleFocusedFeed = restoredFocusedFeed ?? focusedFeed;

  const startFocusedFeed = useCallback(
    (deckId: DeckId, anchorFlashcardId?: string, options?: FocusedFeedOptions) => {
      setFocusedFeed((currentFeed) =>
        createFocusedFeedState(currentFeed, deckId, anchorFlashcardId, options)
      );
    },
    []
  );

  const consumeFocusedFeedTransition = useCallback(() => {
    setFocusedFeed((currentFeed) =>
      currentFeed.status === "ready" && currentFeed.replaceSession
        ? consumeFocusedFeedTransitionState(currentFeed)
        : currentFeed
    );
  }, []);

  const contextValue = {
    consumeFocusedFeedTransition,
    focusedFeed: visibleFocusedFeed,
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
