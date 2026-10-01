import type { DeckId } from "@/features/decks/domain/deck.model";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import type { OpenStudySession } from "@/features/study/domain/study.service";

export interface StudySessionLifecycleTransaction {
  open(
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExisting: boolean,
    now: string,
    sessionId: string
  ): Promise<OpenStudySession>;
}
