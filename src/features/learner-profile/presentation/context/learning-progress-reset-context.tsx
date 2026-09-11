import { createContext, type ReactNode, useContext, useState } from "react";

type LearningProgressResetContextValue = Readonly<{
  revision: number;
  invalidateLearningProgress: () => void;
}>;

const LearningProgressResetContext = createContext<LearningProgressResetContextValue | null>(null);

type LearningProgressResetProviderProps = Readonly<{ children: ReactNode }>;

export function LearningProgressResetProvider({ children }: LearningProgressResetProviderProps) {
  const [revision, setRevision] = useState(0);
  const invalidateLearningProgress = () => setRevision((current) => current + 1);

  return (
    <LearningProgressResetContext.Provider value={{ invalidateLearningProgress, revision }}>
      {children}
    </LearningProgressResetContext.Provider>
  );
}

export function useLearningProgressReset(): LearningProgressResetContextValue {
  const context = useContext(LearningProgressResetContext);
  if (!context) {
    throw new Error("useLearningProgressReset requires LearningProgressResetProvider");
  }
  return context;
}
