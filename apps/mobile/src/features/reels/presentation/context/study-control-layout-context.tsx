import { createContext, type ReactNode, useContext } from "react";

import { usePreferencesContext } from "@/features/preferences/presentation/controllers/preferences-context";
import {
  resolveStudyControlLayout,
  type ResolvedStudyControlLayout,
} from "@/features/reels/presentation/study-control-layout";

const StudyControlLayoutContext = createContext<ResolvedStudyControlLayout | null>(null);

type StudyControlLayoutProviderProps = Readonly<{ children: ReactNode }>;

export function StudyControlLayoutProvider({ children }: StudyControlLayoutProviderProps) {
  const { preferences } = usePreferencesContext();
  const layout = resolveStudyControlLayout({
    audioEnabled: preferences.audioEnabled,
    audioSide: preferences.audioSide,
    ratingDirection: preferences.ratingDirection,
    readingEnabled: preferences.readingEnabled,
    readingSide: preferences.readingSide,
    studyIslandPosition: preferences.studyIslandPosition,
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
