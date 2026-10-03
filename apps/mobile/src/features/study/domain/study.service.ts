import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { Rating } from "@/features/learning-engine/domain/rating";
import type { PreparedReelFeed } from "@/features/study/domain/study-feed";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";

export type OpenStudySession = Readonly<{
  created: boolean;
  replacedSessionId: string | null;
  session: StudySession;
}>;

export type RateAttemptResult = Readonly<
  { status: "rated" } | { status: "locked"; rating: Rating | null } | { status: "missing" }
>;

export type FeedInput = Readonly<{ sessionId: string; cards: readonly Flashcard[] }>;

export type CardInput = FeedInput &
  Readonly<{ reelPosition: number; loadedThroughReelPosition?: number }>;

export type OpenFeedInput = Readonly<{
  cards: readonly Flashcard[];
  scope: StudySessionScope;
  deckId: DeckId | null;
  replaceExisting: boolean;
  anchorFlashcardId: string | null;
}>;

export type StudyFeedSnapshot = Readonly<{
  feed: PreparedReelFeed;
  ratings: ReadonlyMap<number, Rating>;
}>;

export type ActivationResult = Readonly<{
  snapshot: StudyFeedSnapshot | null;
  extensionError: Error | null;
}>;

export type RateCardResult = Readonly<{
  status: "rated" | "locked";
  rating: Rating | null;
  snapshot: StudyFeedSnapshot | null;
}>;

export interface StudyFeedService {
  openFeed(input: OpenFeedInput): Promise<StudyFeedSnapshot>;
  activateCard(input: CardInput): Promise<ActivationResult>;
  rateCard(
    input: CardInput & Readonly<{ rating: Rating; expectedAttempt?: boolean }>
  ): Promise<RateCardResult>;
  extendFeed(input: FeedInput): Promise<StudyFeedSnapshot>;
  refreshFeed(input: FeedInput): Promise<StudyFeedSnapshot>;
  resumeFocusedSession(): Promise<StudySession | null>;
}
