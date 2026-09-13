import type { DeckId } from "@/features/decks/domain/deck.model";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";

export type OpenStudySessionResult = Readonly<{
  created: boolean;
  replacedSessionId: string | null;
  session: StudySession;
}>;

export interface StudySessionLifecycleTransaction {
  open(
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExisting: boolean,
    now: string,
    sessionId: string
  ): Promise<OpenStudySessionResult>;
}
