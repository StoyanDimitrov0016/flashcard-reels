import { createContext, type ReactNode, useContext, useState } from "react";

type DeckThemeSelectionContextValue = Readonly<{
  themeSelectionRevision: number;
  invalidateThemeSelections: () => void;
}>;

const DeckThemeSelectionContext = createContext<DeckThemeSelectionContextValue | null>(null);

type DeckThemeSelectionProviderProps = Readonly<{ children: ReactNode }>;

export function DeckThemeSelectionProvider({ children }: DeckThemeSelectionProviderProps) {
  const [themeSelectionRevision, setThemeSelectionRevision] = useState(0);
  const invalidateThemeSelections = () => setThemeSelectionRevision((revision) => revision + 1);

  return (
    <DeckThemeSelectionContext.Provider
      value={{ themeSelectionRevision, invalidateThemeSelections }}
    >
      {children}
    </DeckThemeSelectionContext.Provider>
  );
}

export function useDeckThemeSelectionRevision(): DeckThemeSelectionContextValue {
  const context = useContext(DeckThemeSelectionContext);
  if (!context) {
    throw new Error("useDeckThemeSelectionRevision requires DeckThemeSelectionProvider");
  }
  return context;
}
