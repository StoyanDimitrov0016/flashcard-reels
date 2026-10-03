export const memoryStateValues = ["new", "learning", "review", "relearning"] as const;
type MemoryState = (typeof memoryStateValues)[number];

export type FlashcardMemoryState = Readonly<{
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

export type SchedulerMemoryState = Readonly<Omit<FlashcardMemoryState, "createdAt" | "updatedAt">>;
