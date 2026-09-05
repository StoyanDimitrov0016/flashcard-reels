import type { DeckId } from "@/features/decks/domain/deck.model";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";

export interface StudySessionRepository {
  completeActiveByScope(scope: StudySessionScope, completedAt: string): Promise<void>;
  complete(sessionId: string, completedAt: string): Promise<void>;
  create(session: StudySession): Promise<void>;
  findActive(scope: StudySessionScope, deckId: DeckId | null): Promise<StudySession | null>;
  updateCurrentPosition(sessionId: string, currentPosition: number): Promise<boolean>;
}
