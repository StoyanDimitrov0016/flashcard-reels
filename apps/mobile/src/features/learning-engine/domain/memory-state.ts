type MemoryState = "new" | "learning" | "review" | "relearning";

export type LearnerMemoryState = Readonly<{
  flashcardId: string;
  state: MemoryState;
  dueAt: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  learningSteps: number;
  lastReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type SchedulerMemoryState = Readonly<Omit<LearnerMemoryState, "createdAt" | "updatedAt">>;
