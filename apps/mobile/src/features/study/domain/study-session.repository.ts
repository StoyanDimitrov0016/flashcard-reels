import type { DeckId } from "@/features/decks/domain/deck.model";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";

export type StudySessionPosition = Readonly<{
  currentReelPosition: number;
  furthestReelPosition: number;
}>;

export interface StudySessionRepository {
  complete(sessionId: string, completedAt: string): Promise<void>;
  create(session: StudySession): Promise<void>;
  findById(sessionId: string): Promise<StudySession | null>;
  findActive(scope: StudySessionScope, deckId: DeckId | null): Promise<StudySession | null>;
  findActiveByScope(scope: StudySessionScope): Promise<StudySession | null>;
  findCompletedSessionsPendingAggregation(limit: number): Promise<StudySession[]>;
  findCompletedSessionsPendingAggregationForDeck(
    deckId: DeckId,
    limit: number
  ): Promise<StudySession[]>;
  updateCurrentReelPosition(
    sessionId: string,
    currentReelPosition: number,
    lastActiveAt: string
  ): Promise<StudySessionPosition | null>;
}
