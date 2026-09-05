import { createContext, type ReactNode, useContext, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";

type FeedScopeContextValue = Readonly<{
  activeScope: FeedScope;
  selectScope: (scope: FeedScope) => void;
  focusedFeed: FocusedFeedState;
  startFocusedFeed: (deckId: DeckId) => void;
  consumeFocusedFeedReplacement: () => void;
}>;

export type FeedScope = "mixed" | "focused";

export type FocusedFeedState =
  | Readonly<{ status: "empty" }>
  | Readonly<{ deckId: DeckId; replaceSession: boolean; revision: number; status: "ready" }>;

const FeedScopeContext = createContext<FeedScopeContextValue | null>(null);

type FeedScopeProviderProps = Readonly<{ children: ReactNode }>;

export function FeedScopeProvider({ children }: FeedScopeProviderProps) {
  const [activeScope, setActiveScope] = useState<FeedScope>("mixed");
  const [focusedFeed, setFocusedFeed] = useState<FocusedFeedState>({ status: "empty" });

  const selectScope = (scope: FeedScope) => {
    setActiveScope(scope);
    if (scope === "focused") {
      setFocusedFeed((currentFeed) =>
        currentFeed.status === "ready" && currentFeed.replaceSession
          ? { ...currentFeed, replaceSession: false }
          : currentFeed
      );
    }
  };

  const startFocusedFeed = (deckId: DeckId) => {
    setFocusedFeed((currentFeed) => ({
      deckId,
      replaceSession: true,
      revision: currentFeed.status === "ready" ? currentFeed.revision + 1 : 1,
      status: "ready",
    }));
    setActiveScope("focused");
  };

  const consumeFocusedFeedReplacement = () => {
    setFocusedFeed((currentFeed) =>
      currentFeed.status === "ready" && currentFeed.replaceSession
        ? { ...currentFeed, replaceSession: false }
        : currentFeed
    );
  };

  const contextValue = {
    activeScope,
    consumeFocusedFeedReplacement,
    focusedFeed,
    selectScope,
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
