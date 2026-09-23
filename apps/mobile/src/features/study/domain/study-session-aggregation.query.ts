import type { DeckId } from "@/features/decks/domain/deck.model";
import type { StudySession } from "@/features/study/domain/study-session.model";

export interface StudySessionAggregationQuery {
  findCompletedSessionsPendingAggregation(limit: number): Promise<StudySession[]>;
  findCompletedSessionsPendingAggregationForDeck(
    deckId: DeckId,
    limit: number
  ): Promise<StudySession[]>;
}
