import { createContext, type ReactNode, useContext } from "react";

import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import {
  resolveStudyControlLayout,
  type ResolvedStudyControlLayout,
} from "@/features/reels/presentation/study-control-layout";

const StudyControlLayoutContext = createContext<ResolvedStudyControlLayout | null>(null);

type StudyControlLayoutProviderProps = Readonly<{ children: ReactNode }>;

export function StudyControlLayoutProvider({ children }: StudyControlLayoutProviderProps) {
  const { preferences } = usePreferences();
  const layout = resolveStudyControlLayout({
    audioEnabled: preferences.audioEnabled,
    audioSide: preferences.audioSide,
    ratingDirection: preferences.ratingDirection,
    recollectionIslandPosition: preferences.recollectionIslandPosition,
  });

  return (
    <StudyControlLayoutContext.Provider value={layout}>
      {children}
    </StudyControlLayoutContext.Provider>
  );
}

export function useStudyControlLayout(): ResolvedStudyControlLayout {
  const layout = useContext(StudyControlLayoutContext);
  if (!layout) {
    throw new Error("useStudyControlLayout requires StudyControlLayoutProvider");
  }
  return layout;
}
