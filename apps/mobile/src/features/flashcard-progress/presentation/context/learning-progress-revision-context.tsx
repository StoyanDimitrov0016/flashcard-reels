import { createContext, type ReactNode, useContext, useState } from "react";

type LearningProgressRevisionContextValue = Readonly<{
  revision: number;
  invalidateLearningProgress: () => void;
}>;

const LearningProgressRevisionContext = createContext<LearningProgressRevisionContextValue | null>(
  null
);

type LearningProgressRevisionProviderProps = Readonly<{ children: ReactNode }>;

export function LearningProgressRevisionProvider({
  children,
}: LearningProgressRevisionProviderProps) {
  const [revision, setRevision] = useState(0);
  const invalidateLearningProgress = () => setRevision((current) => current + 1);

  return (
    <LearningProgressRevisionContext.Provider value={{ invalidateLearningProgress, revision }}>
      {children}
    </LearningProgressRevisionContext.Provider>
  );
}

export function useLearningProgressRevision(): LearningProgressRevisionContextValue {
  const context = useContext(LearningProgressRevisionContext);
  if (!context) {
    throw new Error("useLearningProgressRevision requires LearningProgressRevisionProvider");
  }
  return context;
}
