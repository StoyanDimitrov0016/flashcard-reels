import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

export type PreparedReelOccurrence = Readonly<{
  card: Flashcard;
  key: string;
  recurrenceId: string | null;
  reelPosition: number;
}>;

export type PreparedReelOccurrences = readonly PreparedReelOccurrence[];

export type PreparedReelFeed = Readonly<{
  occurrences: PreparedReelOccurrences;
  currentReelPosition: number;
  loadedFromReelPosition: number;
  loadedThroughReelPosition: number;
  materializedThroughReelPosition: number;
  studySessionId: string;
}>;
