import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { PreparedReelFeed, PreparedReelOccurrences } from "@/features/reels/domain/reel-feed";
import type { StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionStrategy } from "@/features/study/domain/study-session-strategy";

export interface ReelFeedService {
  prepareFeed(
    cards: readonly Flashcard[],
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExistingSession: boolean,
    strategy?: StudySessionStrategy
  ): Promise<PreparedReelFeed>;
  extendFeed(cards: readonly Flashcard[], studySessionId: string): Promise<PreparedReelFeed>;
  refreshOccurrences(
    sourceCards: readonly Flashcard[],
    studySessionId: string
  ): Promise<PreparedReelOccurrences>;
  refreshFeed(sourceCards: readonly Flashcard[], studySessionId: string): Promise<PreparedReelFeed>;
}
