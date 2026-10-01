import type { DeckId } from "@/features/decks/domain/deck.model";
import type { StudySession } from "@/features/study/domain/study-session.model";

export interface StudySessionAggregationQuery {
  findCompletedPending(limit: number): Promise<StudySession[]>;
  findCompletedPendingForDeck(deckId: DeckId, limit: number): Promise<StudySession[]>;
}
