import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { FlashcardReviewAttempt } from "@/features/study/domain/flashcard-review-attempt.model";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import type { StudySessionItem } from "@/features/study/domain/study-session-item.model";
import type { StudySessionRecurrence } from "@/features/study/domain/study-session-recurrence.model";
import type { StudySession, StudySessionScope } from "@/features/study/domain/study-session.model";
import type { StudySessionPosition } from "@/features/study/domain/study-session.repository";

type OpenStudySession = Readonly<{
  created: boolean;
  replacedSessionId: string | null;
  session: StudySession;
}>;

export interface StudyService {
  openSession(
    scope: StudySessionScope,
    deckId: DeckId | null,
    replaceExisting: boolean
  ): Promise<OpenStudySession>;
  completeSession(sessionId: string): Promise<void>;
  findSession(sessionId: string): Promise<StudySession | null>;
  findSessionByScope(scope: StudySessionScope): Promise<StudySession | null>;
  recoverPendingCompletedSessionAggregation(limit?: number): Promise<void>;
  getAggregationEligibility(sessionId: string): Promise<Readonly<{
    shouldCheck: boolean;
    safeThroughReelPosition: number;
  }> | null>;
  appendSessionItems(
    sessionId: string,
    cards: readonly Flashcard[],
    feedState: string,
    baseFeedPositionStart?: number,
    reelPositions?: number[]
  ): Promise<void>;
  updateSessionFeedState(sessionId: string, feedState: string): Promise<void>;
  listSessionItems(sessionId: string): Promise<StudySessionItem[]>;
  findMaxSessionBaseFeedPosition(sessionId: string): Promise<number | null>;
  findMaxSessionReelPosition(sessionId: string): Promise<number | null>;
  listSessionItemsInReelPositionRange(
    sessionId: string,
    fromReelPosition: number,
    throughReelPosition: number
  ): Promise<StudySessionItem[]>;
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
  rateAttempt(attemptId: string, rating: RecallLevel): Promise<boolean>;
  consumeRecurrence(recurrenceId: string): Promise<boolean>;
  finalizeAttempt(attemptId: string): Promise<void>;
  finalizeAttemptsOutsideEditableWindow(studySessionId: string): Promise<void>;
}
