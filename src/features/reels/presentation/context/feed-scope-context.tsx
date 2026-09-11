import { createContext, type ReactNode, useContext, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";
import { useFocusedFeedLifecycle } from "@/features/reels/presentation/hooks/use-focused-feed-lifecycle";
import type { FocusedFeedOptions } from "@/features/reels/presentation/open-focused-feed";

type FeedScopeContextValue = Readonly<{
  focusedFeed: FocusedFeedState;
  focusRestoring: boolean;
  focusRevision: number;
  startFocusedFeed: (
    deckId: DeckId,
    anchorFlashcardId?: string,
    options?: FocusedFeedOptions
  ) => void;
  consumeFocusedFeedReplacement: () => void;
}>;

export type FocusedFeedState =
  | Readonly<{ status: "empty" }>
  | Readonly<{
      deckId: DeckId;
      replaceSession: boolean;
      revision: number;
      status: "ready";
      anchorFlashcardId: string | null;
      options?: FocusedFeedOptions;
    }>;

const FeedScopeContext = createContext<FeedScopeContextValue | null>(null);

type FeedScopeProviderProps = Readonly<{ children: ReactNode }>;

export function FeedScopeProvider({ children }: FeedScopeProviderProps) {
  const [focusedFeed, setFocusedFeed] = useState<FocusedFeedState>({ status: "empty" });
  const focusLifecycle = useFocusedFeedLifecycle();
  const restoredFocusedFeed =
    focusedFeed.status === "empty" &&
    focusLifecycle.session !== null &&
    focusLifecycle.session.deckId !== null
      ? {
          deckId: focusLifecycle.session.deckId,
          replaceSession: false,
          revision: focusLifecycle.revision,
          status: "ready" as const,
          anchorFlashcardId: null,
        }
      : null;
  const visibleFocusedFeed = restoredFocusedFeed ?? focusedFeed;

  const startFocusedFeed = (
    deckId: DeckId,
    anchorFlashcardId?: string,
    options?: FocusedFeedOptions
  ) => {
    setFocusedFeed((currentFeed) => ({
      deckId,
      replaceSession: true,
      revision: currentFeed.status === "ready" ? currentFeed.revision + 1 : 1,
      status: "ready",
      anchorFlashcardId: anchorFlashcardId ?? null,
      options,
    }));
  };

  const consumeFocusedFeedReplacement = () => {
    setFocusedFeed((currentFeed) =>
      currentFeed.status === "ready" && currentFeed.replaceSession
        ? { ...currentFeed, replaceSession: false }
        : currentFeed
    );
  };

  const contextValue = {
    consumeFocusedFeedReplacement,
    focusedFeed: visibleFocusedFeed,
    focusRevision: focusLifecycle.revision,
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
