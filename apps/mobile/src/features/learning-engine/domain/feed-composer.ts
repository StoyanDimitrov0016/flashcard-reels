import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import type { FlashcardMemoryState } from "./flashcard-memory-state";

export const FEED_RECENT_CARD_LIMIT = 3;

export type FeedCandidate = Readonly<{
  card: Flashcard;
  memoryState: FlashcardMemoryState | null;
  retrievability: number | null;
  dueAt: string | null;
  isDue: boolean;
  isNew: boolean;
  isReservedForImmediateRecurrence: boolean;
}>;

export type FeedState = Readonly<{
  recentCardIds: readonly string[];
}>;

export function rememberCard(state: FeedState, cardId: string): FeedState {
  return {
    recentCardIds: [...state.recentCardIds.filter((current) => current !== cardId), cardId].slice(
      -FEED_RECENT_CARD_LIMIT
    ),
  };
}

export type FeedComposerInput = Readonly<{
  candidates: readonly FeedCandidate[];
  state: FeedState;
}>;

export type FeedChoice = Readonly<{
  candidate: FeedCandidate;
  state: FeedState;
}>;

export interface FeedComposer {
  chooseNext(input: FeedComposerInput): FeedChoice | null;
}
