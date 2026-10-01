# Study module design — owner review

This is a proposal after Parts 1–4, not approval to implement Part 6.

## Audit corrections and signals

`StudyService` has 25 members, plus 2 settlement members on the same object.
`StudyServiceImpl` has 622 lines; `useReelController` has 405 lines and returns 17 members
(8 explicit plus the 9 from `useRecallSession`). `ReelFeed` alone calls `useReelController`;
`useReelController` alone calls `useRecallSession` in production.
The 11 listed repository/transaction pass-throughs and 2 clock-only members are confirmed.
`findSessionByScope`, `listSessionReels`, `listSessionRecurrences`, and `getAggregationEligibility`
have no production caller outside the implementation. `commitAttempt`, `completeSession`, and
`recoverPendingCompletedSessionAggregation` also need no public runtime entry point.
Feed materialization, activation, and rating still expose their multi-call protocols.
Proposed signals: 25 study + 5 feed + 2 settlement members → 6 runtime + 2 settlement;
13 public pass-through/clock-only members → 0; controller members 17 → 8 (proposed only).

## Current interfaces

Names below reuse the existing domain types: Session = StudySession, Scope = StudySessionScope,
Feed = PreparedReelFeed, Occurrence = PreparedReelOccurrence, Attempt = FlashcardReviewAttempt,
Reel = StudySessionReel, Recurrence = StudySessionRecurrence, Position = StudySessionPosition.

```ts
interface StudyService {
  openSession(scope: Scope, deckId: DeckId | null, replace: boolean): Promise<OpenStudySession>;
  resumeFocusedSession(): Promise<Session | null>;
  completeSession(id: string): Promise<void>;
  settleForProgressBackup(): Promise<void>;
  compactSessionRuntimeData(id: string, furthest: number): Promise<void>;
  findSession(id: string): Promise<Session | null>;
  findSessionByScope(scope: Scope): Promise<Session | null>;
  recoverPendingCompletedSessionAggregation(limit?: number): Promise<void>;
  getAggregationEligibility(id: string): Promise<{ shouldCheck: boolean; safeThroughReelPosition: number } | null>;
  appendSessionReels(id: string, cards: readonly Flashcard[], baseStart?: number, positions?: number[]): Promise<void>;
  updateSessionFeedState(id: string, state: string): Promise<void>;
  listSessionReels(id: string): Promise<Reel[]>;
  findMaxSessionBaseFeedPosition(id: string): Promise<number | null>;
  findMaxSessionReelPosition(id: string): Promise<number | null>;
  listSessionReelsInReelPositionRange(id: string, from: number, through: number): Promise<Reel[]>;
  listSessionRecurrences(id: string): Promise<Recurrence[]>;
  listPendingRecurrenceFlashcardIdsFromTargetPosition(id: string, from: number): Promise<string[]>;
  listSessionRecurrencesInTargetRange(id: string, from: number, through: number): Promise<Recurrence[]>;
  updateSessionReelPosition(id: string, position: number): Promise<Position | null>;
  startAttempt(cardId: string, position: number, sessionId: string): Promise<string>;
  listReviewAttemptsInReelPositionRange(id: string, from: number, through: number): Promise<Attempt[]>;
  rateAttempt(id: string, rating: Rating): Promise<RateAttemptResult>;
  consumeRecurrence(id: string): Promise<boolean>;
  commitAttempt(id: string): Promise<void>;
  commitAttemptsOutsideEditableWindow(id: string): Promise<void>;
}
interface ReelFeedService {
  prepareFeed(cards: readonly Flashcard[], scope: Scope, deckId: DeckId | null, replace: boolean, anchor: string | null): Promise<Feed>;
  extendFeed(cards: readonly Flashcard[], sessionId: string): Promise<Feed>;
  recordVisibleCard(sessionId: string, cardId: string): Promise<void>;
  refreshOccurrences(cards: readonly Flashcard[], sessionId: string): Promise<readonly Occurrence[]>;
  refreshFeed(cards: readonly Flashcard[], sessionId: string): Promise<Feed>;
}
interface StudySessionSettlement {
  settleActiveSessionsAffectedByDeck(deckId: DeckId, includeFocused: boolean): Promise<void>;
  settleBeforeDeckRemoval(deckId: DeckId): Promise<void>;
}
type CurrentReelController = {
  feed: Feed; fatalError: Error | null; extensionError: Error | null; refreshError: Error | null;
  onOccurrenceBecameActive(position: number): void; onRatingSelected(item: Occurrence, rating: Rating): void;
  requestFeedExtension(): Promise<void>; retryFeedExtension(): void;
  attemptIds: ReadonlyMap<number, string>; ratings: ReadonlyMap<number, Rating>;
  revealedPositions: ReadonlySet<number>; loadError: Error | null;
  getAttemptId(position: number): string | undefined; getRating(position: number): Rating | undefined;
  setAttemptId(position: number, id: string): void; rateCard(position: number, rating: Rating): void;
  toggleCard(position: number): void;
};
```

## Proposed interfaces and caller intents

```ts
type FeedInput = Readonly<{ sessionId: string; cards: readonly Flashcard[] }>;
type CardInput = FeedInput & Readonly<{ reelPosition: number }>;
type OpenFeedInput = Readonly<{
  cards: readonly Flashcard[]; scope: Scope; deckId: DeckId | null;
  replaceExisting: boolean; anchorFlashcardId: string | null;
}>;
type StudyFeedSnapshot = Readonly<{ feed: Feed; ratings: ReadonlyMap<number, Rating> }>;
type ActivationResult = Readonly<{ snapshot: StudyFeedSnapshot; extensionError: Error | null }>;
type RateCardResult = Readonly<{ status: "rated" | "locked"; snapshot: StudyFeedSnapshot }>;
interface StudyFeedService {
  openFeed(input: OpenFeedInput): Promise<StudyFeedSnapshot>; // open a feed
  activateCard(input: CardInput): Promise<ActivationResult>; // card became active, including edge extension
  rateCard(input: CardInput & Readonly<{ rating: Rating }>): Promise<RateCardResult>; // start + rate + recurrence refresh
  extendFeed(input: FeedInput): Promise<StudyFeedSnapshot>; // list edge or extension retry
  refreshFeed(input: FeedInput): Promise<StudyFeedSnapshot>; // refresh feed and persisted ratings
  resumeFocusedSession(): Promise<Session | null>; // existing Focus foreground lifecycle policy
}
type DeckChange = Readonly<{ deckId: DeckId; kind: "first-install" | "update" | "remove" | "reset" }>;
interface StudySessionSettlement {
  settleDeckChange(change: DeckChange): Promise<void>; // settle before a deck change
  settleForProgressBackup(): Promise<void>; // preserve backup's full drain contract
}
type ReelController = Readonly<{
  feed: Feed;
  cardState(position: number): Readonly<{ rating: Rating | null; revealed: boolean }>;
  activate(position: number): void;
  rate(position: number, rating: Rating): void;
  toggle(position: number): void;
  extend(): Promise<void>;
  retryExtension(): void;
  feedback: Readonly<{ fatal: Error | null; extension: Error | null; refresh: Error | null }>;
}>;
```

The controller retains UI recall/reveal state, initial Focus transfer state, mounted-window merging,
load sequencing, and toast lifetime. It exposes no attempt IDs, persistence setters, or recall load
error alias. `cardState` reads reactive state; changes still rerender cards. The feedback object owns
one presentation responsibility: fatal boundary versus extension notice versus refresh toast.

`activateCard` owns attempt creation, monotonic position, recurrence consumption, visible-card state,
pending-rating settlement, editable-window commits, compaction, and conditional extension. A failed
extension returns its error with the saved activation snapshot; it cannot make activation fatal.
`rateCard` owns attempt lookup/creation and recurrence refresh. Locked ratings retain saved values;
a known attempt missing from an active session stays fatal. Session end still triggers invalidation.
First install excludes Focus; removal fully drains completed sessions for that deck; reset does not
inherit removal's extra drain. No-op imports still skip settlement. All-reset semantics stay intact.

## Ownership and split decision

Keep one `StudyServiceImpl` coordinator implementing the two consumer interfaces. Their callers
differ, but they share attempt/commit ordering, Focus lifetime, aggregation checkpoints, and session
state: the spec's no-shared-state split rule is not satisfied. Do not create thin sub-services.
Keep FSRS and feed-selection policies separate. Turn the existing reel materializer into an internal
application collaborator with explicit repository/transaction inputs, not the public StudyService.
The study runtime owns reel, recurrence, and attempt query ports; the materializer consumes them
directly. No query-shaped pass-throughs remain on consumer interfaces. Composition constructs this
graph without a service locator or a cycle between public study and feed services.

## Behavior protection and risks

Keep assertions in study-session, learning-engine, aggregation, reset, SQLite rollback, installation,
backup, and deletion integration suites. Move tests of removed members to the matching intent,
preserving ordering, recurrence slots, edit cutoff, checkpoint, and bounded-history assertions.
Retain the new affected-session, mounted rating, feed-state race, refresh ordering, and foreground
tests. Add equivalent intent-level scenarios before deleting the old protocol entry points.
Risks: deadlocks when activation waits on rating work; changed review chronology; accidental
extension failure escalation; unbounded known-attempt tracking; loss of transferred reveal/rating
state; and stale snapshots overwriting newer activation positions. Preserve the current queue and
transaction boundaries, keep known-attempt state bounded to the mounted range, and test these.
Part 5 changes runtime signal counts by zero. Part 6 requires owner approval of this document.
