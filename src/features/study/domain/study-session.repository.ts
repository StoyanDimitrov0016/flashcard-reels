import type { DeckId } from "@/features/decks/domain/deck.model";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";

export interface StudySessionRepository {
  complete(sessionId: string, completedAt: string): Promise<void>;
  create(session: StudySession): Promise<void>;
  findById(sessionId: string): Promise<StudySession | null>;
  findActive(scope: StudySessionScope, deckId: DeckId | null): Promise<StudySession | null>;
  findActiveByScope(scope: StudySessionScope): Promise<StudySession | null>;
  updateCurrentReelPosition(
    sessionId: string,
    currentReelPosition: number,
    lastActiveAt: string
  ): Promise<boolean>;
}
