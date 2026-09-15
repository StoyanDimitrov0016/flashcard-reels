import { createContext, type ReactNode, useContext, useState } from "react";

export type DeckContentContextValue = Readonly<{
  revision: number;
  invalidateDeckContent: () => void;
}>;

const DeckContentContext = createContext<DeckContentContextValue | null>(null);

type DeckContentProviderProps = Readonly<{ children: ReactNode }>;

export function DeckContentProvider({ children }: DeckContentProviderProps) {
  const [revision, setRevision] = useState(0);
  const invalidateDeckContent = () => setRevision((current) => current + 1);

  return (
    <DeckContentContext.Provider value={{ invalidateDeckContent, revision }}>
      {children}
    </DeckContentContext.Provider>
  );
}

export function useDeckContentRevision(): DeckContentContextValue {
  const context = useContext(DeckContentContext);
  if (!context) {
    throw new Error("useDeckContentRevision requires DeckContentProvider");
  }
  return context;
}

export function useInvalidateDeckContent(): () => void {
  return useDeckContentRevision().invalidateDeckContent;
}
