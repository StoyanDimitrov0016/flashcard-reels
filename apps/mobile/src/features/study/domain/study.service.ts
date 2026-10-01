import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { Rating } from "@/features/learning-engine/domain/rating";
import type { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySessionReel } from "@/features/study/domain/study-session-reel.model";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionPosition } from "@/features/study/domain/study-session.repository";

export type OpenStudySession = Readonly<{
  created: boolean;
  replacedSessionId: string | null;
  session: StudySession;
}>;

export type RateAttemptResult = Readonly<
  { status: "rated" } | { status: "locked"; rating: Rating | null } | { status: "missing" }
>;

export interface StudyService {
  openSession(
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExisting: boolean
  ): Promise<OpenStudySession>;
  resumeFocusedSession(): Promise<StudySession | null>;
  completeSession(sessionId: string): Promise<void>;
  settleForProgressBackup(): Promise<void>;
  compactSessionRuntimeData(sessionId: string, furthestReelPosition: number): Promise<void>;
  findSession(sessionId: string): Promise<StudySession | null>;
  findSessionByScope(scope: StudySessionScope): Promise<StudySession | null>;
  recoverPendingCompletedSessionAggregation(limit?: number): Promise<void>;
  getAggregationEligibility(sessionId: string): Promise<Readonly<{
    shouldCheck: boolean;
    safeThroughReelPosition: number;
  }> | null>;
  appendSessionReels(
    sessionId: string,
    cards: readonly Flashcard[],
    feedState: string,
    baseFeedPositionStart?: number,
    reelPositions?: number[]
  ): Promise<void>;
  updateSessionFeedState(sessionId: string, feedState: string): Promise<void>;
  listSessionReels(sessionId: string): Promise<StudySessionReel[]>;
  findMaxSessionBaseFeedPosition(sessionId: string): Promise<number | null>;
  findMaxSessionReelPosition(sessionId: string): Promise<number | null>;
  listSessionReelsInReelPositionRange(
    sessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<StudySessionReel[]>;
  listSessionRecurrences(sessionId: string): Promise<StudySessionRecurrence[]>;
  listPendingRecurrenceFlashcardIdsFromTargetPosition(
    sessionId: string,
    fromTargetReelPosition: number
  ): Promise<string[]>;
  listSessionRecurrencesInTargetRange(
    sessionId: string,
    fromTargetReelPosition: number,
    throughTargetReelPosition: number
  ): Promise<StudySessionRecurrence[]>;
  updateSessionReelPosition(
    sessionId: string,
    currentReelPosition: number
  ): Promise<StudySessionPosition | null>;
  startAttempt(flashcardId: string, reelPosition: number, studySessionId: string): Promise<string>;
  listReviewAttemptsInReelPositionRange(
    sessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<FlashcardReviewAttempt[]>;
  rateAttempt(attemptId: string, rating: Rating): Promise<RateAttemptResult>;
  consumeRecurrence(recurrenceId: string): Promise<boolean>;
  commitAttempt(attemptId: string): Promise<void>;
  commitAttemptsOutsideEditableWindow(studySessionId: string): Promise<void>;
}
