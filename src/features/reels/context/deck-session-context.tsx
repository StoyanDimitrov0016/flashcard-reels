import { createContext, type ReactNode, useContext, useState } from "react";

import type { DeckId } from "@/features/decks/domain/deck.model";

type DeckSessionContextValue = Readonly<{
  activeMode: FeedMode;
  selectMode: (mode: FeedMode) => void;
  session: DeckSession;
  startSession: (deckId: DeckId) => void;
}>;

export type FeedMode = "for-you" | "session";

export type DeckSession =
  | Readonly<{ status: "empty" }>
  | Readonly<{ deckId: DeckId; status: "ready" }>;

const DeckSessionContext = createContext<DeckSessionContextValue | null>(null);

type DeckSessionProviderProps = Readonly<{ children: ReactNode }>;

export function DeckSessionProvider({ children }: DeckSessionProviderProps) {
  const [activeMode, selectMode] = useState<FeedMode>("for-you");
  const [session, setSession] = useState<DeckSession>({ status: "empty" });
  const contextValue = {
    activeMode,
    selectMode,
    session,
    startSession: (deckId: DeckId) => {
      setSession({ deckId, status: "ready" });
      selectMode("session");
    },
  };
  return <DeckSessionContext.Provider value={contextValue}>{children}</DeckSessionContext.Provider>;
}

export function useDeckSession() {
  const context = useContext(DeckSessionContext);
  if (!context) {
    throw new Error("useDeckSession requires DeckSessionProvider");
  }
  return context;
}
