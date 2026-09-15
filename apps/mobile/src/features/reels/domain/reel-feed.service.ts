import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { PreparedReelFeed, PreparedReelOccurrences } from "@/features/reels/domain/reel-feed";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";

export interface ReelFeedService {
  prepareFeed(
    cards: readonly Flashcard[],
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExistingSession: boolean,
    anchorFlashcardId?: string | null
  ): Promise<PreparedReelFeed>;
  extendFeed(cards: readonly Flashcard[], studySessionId: string): Promise<PreparedReelFeed>;
  recordVisibleCard(studySessionId: string, flashcardId: string): Promise<void>;
  refreshOccurrences(
    sourceCards: readonly Flashcard[],
    studySessionId: string
  ): Promise<PreparedReelOccurrences>;
  refreshFeed(sourceCards: readonly Flashcard[], studySessionId: string): Promise<PreparedReelFeed>;
}
