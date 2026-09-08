import { createContext, type ReactNode, useContext, useState } from "react";

type DeckAppearanceContextValue = Readonly<{
  appearanceRevision: number;
  invalidateAppearances: () => void;
}>;

const DeckAppearanceContext = createContext<DeckAppearanceContextValue | null>(null);

export function DeckAppearanceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [appearanceRevision, setAppearanceRevision] = useState(0);
  const invalidateAppearances = () => setAppearanceRevision((revision) => revision + 1);
  return (
    <DeckAppearanceContext.Provider value={{ appearanceRevision, invalidateAppearances }}>
      {children}
    </DeckAppearanceContext.Provider>
  );
}

export function useDeckAppearanceRevision(): DeckAppearanceContextValue {
  const context = useContext(DeckAppearanceContext);
  if (!context) {
    throw new Error("useDeckAppearanceRevision requires DeckAppearanceProvider");
  }
  return context;
}
