# Flashcard Reels — Phase 0 Runtime Stabilization

## Goal

Make the current Phase 0 app reliable enough that the next device build is worth evaluating as a product rather than as an architecture prototype.

This phase focuses on runtime correctness and feed continuity:

- resetting learning state must truly reset scheduler memory
- imported/updated decks must become visible to an already-mounted Discovery feed
- an explicit rating must never lose a race with finalization
- the visible feed should use FlashList and maintain stable item indexes during the mounted session
- infinite-feed extension should have both the existing proactive path and a list-level defensive prefetch path
- the Android build should request only audio permissions that the current playback-only feature requires
- rating haptics should be subtle and semantically appropriate
- the important behavior should be locked with deterministic regression tests

Keep the current learning-engine, study-session, preferences, and deck-installer architecture.

---

# 1. Install and use FlashList for the reel feed

The current app uses Expo SDK 57 / React Native 0.86.

Install the Expo-recommended package with:

```bash
npx expo install @shopify/flash-list
```

Expo SDK 57 currently resolves the recommended FlashList 2.x release.

Replace the reel feed's React Native `FlatList` with:

```ts
import { FlashList } from "@shopify/flash-list";
```

in:

`src/features/reels/presentation/components/reel-feed.tsx`

FlashList owns:

- row recycling
- viewport rendering
- list-level end detection

The existing ReelFeedService continues to own:

- study-session persistence
- materialization
- recurrence overlays
- scheduler-aware candidate generation
- current reel position
- feed extension

Do not move learning/feed semantics into the list component.

---

# 2. Keep the mounted UI feed position-stable

The current prepared feed is a sliding persistence window.

`ReelFeedServiceImpl.buildPreparedFeed(...)` intentionally loads roughly:

- past window
- current reel
- future window

and advances `loadedFromReelPosition`.

That is useful for persistence/restoration, but the mounted list currently mirrors that sliding window. When the front is trimmed, local list indexes shift and `ReelFeed` compensates with `scrollToIndex(...)`.

For the live mounted session, introduce a presentation/controller-level accumulated occurrence list.

## Required behavior

On initial mount:

- use the bounded prepared feed returned by the service
- calculate the initial local index normally

After mount:

- when `extendFeed(...)` or `refreshFeed(...)` returns another prepared slice, merge that slice into the mounted occurrence collection by absolute `reelPosition`
- replace an existing occurrence at the same `reelPosition` when refreshed
- append newly materialized future positions
- preserve previously mounted earlier occurrences
- keep occurrences sorted by `reelPosition`
- never shift the current card's local index merely because the persistence window advanced

The database/service can remain bounded.

The mounted UI collection is allowed to grow for the lifetime of the screen instance.

FlashList recycling handles native rendered-cell pressure.

A fresh screen/app restoration starts again from the service's bounded persisted window.

## Merge invariant

There must be at most one mounted occurrence for each absolute `reelPosition`.

The identity/order contract is:

```text
absolute reelPosition is the list coordinate
occurrence key is render identity
```

A recurrence refresh may replace the card/key at an already-materialized future reel position without changing that position's array index.

---

# 3. Remove sliding-window scroll correction from normal forward use

Once the mounted feed accumulates occurrences, normal feed extension must not require the existing:

`loadedFromReelPosition changed → scrollToIndex(current position)`

correction cycle.

Keep imperative `scrollToIndex` only for genuine restoration/anchor positioning when it is actually required.

Normal forward materialization should preserve the visible item's local index naturally.

This is the main anti-flicker invariant.

---

# 4. FlashList reel configuration

Preserve the existing full-screen paged vertical interaction.

Use FlashList with:

- `pagingEnabled`
- `showsVerticalScrollIndicator={false}`
- the existing stable occurrence key extractor
- existing momentum-end active-position calculation
- current active/revealed/rating extra data as needed
- a ref compatible with restoration/anchor scrolling

FlashList v2 does not require `estimatedItemSize`.

Retain fixed viewport-height reel rendering.

Remove FlatList-only tuning props that no longer provide value after the migration.

---

# 5. Add defensive end prefetch

Keep the existing proactive extension policy:

`shouldExtendReelFeed(...)`

The active-reel lifecycle remains the primary extension trigger because it aligns extension with committed study state.

Also wire FlashList:

```ts
onEndReached;
onEndReachedThreshold;
```

to the same guarded extension request.

Use a modest threshold such as one visible viewport.

This is a fallback for:

- fast swiping
- slower SQLite work
- device scheduling variance

Both extension triggers must share the existing single-flight guard.

Repeated triggers while an extension is in progress must result in one extension operation.

Expose one controller callback such as:

`requestFeedExtension()`

and use it from both the active-card policy and FlashList.

---

# 6. True learning-progress reset

The current reset path only resets `learner_profiles`.

That is incomplete because `flashcard_memory_states` remains authoritative for FSRS scheduling.

Introduce one application-owned learning reset transaction.

A suitable location is under the learner-progress/profile feature because that is where the user-facing reset capability already lives.

Suggested application contract:

```ts
interface LearningProgressResetTransaction {
  resetCard(flashcardId: string, resetAt: string): Promise<void>;
  resetDeck(deckId: DeckId, resetAt: string): Promise<void>;
  resetAll(resetAt: string): Promise<void>;
}
```

Implement it in SQLite.

`LearnerProfileServiceImpl` can delegate its existing reset methods to this transaction.

Keep the public presentation/service API stable where practical.

---

# 7. Reset transaction semantics

A reset establishes a temporal boundary.

For the affected flashcards it must:

1. reset learner-profile statistics using the existing reset timestamp semantics
2. delete the matching rows from `flashcard_memory_states`
3. invalidate active study sessions that can contain affected provisional attempts

The transaction must be atomic.

## Global reset

For `resetAll`:

- reset every learner profile
- delete all flashcard memory states
- delete all currently active study sessions

Deleting an active `study_sessions` row is appropriate because its child:

- study session items
- review attempts
- recurrences

already cascade through foreign keys.

This prevents a provisional pre-reset rating from finalizing later and recreating memory state.

Historical completed sessions may remain because learner-profile aggregation already honors `resetAt`.

## Deck reset

For `resetDeck(deckId)`:

- reset profiles for cards in the deck
- delete memory states for cards in the deck
- delete the active mixed session, because it may contain the affected deck
- delete the active focused session when it is for that deck

This intentionally starts a fresh mixed feed after a deck-specific reset.

## Card reset

For `resetCard(flashcardId)`:

- reset that card's learner profile
- delete that card's memory state
- invalidate active sessions that can contain that card

Use the same simple safety boundary as deck reset rather than preserving provisional active-session state around a destructive reset.

---

# 8. Reset postconditions

After a successful reset:

- affected cards have no `flashcard_memory_states` row
- affected learner-profile counters are zero
- affected active/provisional session state cannot later recreate old memory
- the next feed treats the affected cards as new learner-memory cards
- installed deck/card content remains untouched

Add one service/UI refresh signal after successful reset so Progress and feed screens can naturally prepare new state.

---

# 9. Content revision for imported/updated decks

The current:

`src/features/flashcards/presentation/hooks/use-flashcards.ts`

loads only when:

- `deckId`
- `flashcardService`

changes.

An already-mounted Discover tab therefore retains the old source-card array after import.

Add a small deck-content revision context.

Suggested location:

`src/features/decks/presentation/context/deck-content-context.tsx`

Contract:

```ts
type DeckContentContextValue = Readonly<{
  revision: number;
  invalidateDeckContent: () => void;
}>;
```

Mount it around the tab tree near the existing `DeckAppearanceProvider`.

Add:

`useDeckContentRevision()`

and:

`useInvalidateDeckContent()`

hooks.

This is a React invalidation signal, not a domain event bus.

---

# 10. Trigger content invalidation after successful package changes

Update:

`src/features/decks/presentation/hooks/use-import-deck-package.ts`

After:

`deckInstaller.installFromFile(...)`

if result status is:

- `installed`
- `updated`

call:

`invalidateDeckContent()`

A `no-op` install does not need to increment the revision.

Library may keep its local immediate refresh if useful, but shared content consumers should rely on the common revision.

---

# 11. Make flashcard/deck content hooks revision-aware

At minimum, make:

`useFlashcards(...)`

depend on deck-content revision.

Also apply the same revision to other mounted hooks whose source data changes after package install, such as the deck catalog/details where appropriate.

The important behavior is:

- Discovery stays mounted
- a deck is imported
- source flashcards reload
- future Discovery materialization can use the new deck
- the current study session is not discarded just to refresh eligible content

The new source-card array should flow into `useReelController`.

Future extension requests then use the newest source cards.

---

# 12. Handle source-card updates inside the mounted Reel controller

The controller currently closes over:

`sourceCards`

for extension and refresh callbacks.

Ensure a content refresh updates the source-card input used by future:

- `extendFeed(...)`
- `refreshFeed(...)`

without recreating the active study session or resetting the visible reel.

Use a ref if necessary so queued callbacks always observe the latest eligible source cards.

This is important for auto-discovery after import.

---

# 13. Close the pending-rating/finalization race

The current activation lifecycle is serialized through:

`activationQueue`

but:

`onRatingSelected(...)`

runs independently.

An explicit rating initiated before a card leaves the editable window must settle before finalization can commit that attempt.

Add a session-local pending-rating barrier to:

`src/features/reels/presentation/hooks/use-reel-controller.ts`

## Required behavior

When a rating is selected:

- create/track the promise covering `startAttempt + rateAttempt`
- keep it tracked until persistence completes

Before:

`finalizeAttemptsOutsideEditableWindow(...)`

inside the activation queue:

- await all currently pending rating persistence promises for this mounted session

The editable window is only five reels, so awaiting the small current set is preferred over a complicated per-attempt scheduler.

A rating initiated before finalization therefore cannot be silently finalized as a skip.

---

# 14. Coordinate recurrence refresh with the rating barrier

The persistence part of the rating promise is the correctness boundary.

After `rateAttempt(...)` succeeds:

- update local recall state
- refresh recurrence/feed when Again/Hard state changed as it does today

Make concurrent refresh/extension replacement use the same mounted occurrence merge path introduced for FlashList.

A recurrence refresh should update affected future reel positions without discarding accumulated earlier mounted occurrences.

---

# 15. Reel controller sequencing

The active-occurrence pipeline should remain conceptually:

```text
start attempt
→ persist current position
→ consume current recurrence
→ record visible card
→ await pending rating persistence
→ finalize attempts outside editable window
→ extend feed if near end
```

This ordering preserves:

- current occurrence persistence
- recurrence consumption
- rating correctness
- fresh FSRS memory before next materialization

Keep this ordering explicit in one application/helper function and test it.

---

# 16. Android audio permission cleanup

The app currently configures `expo-audio` as a bare plugin and manually requests:

- `RECORD_AUDIO`
- `MODIFY_AUDIO_SETTINGS`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_MEDIA_PLAYBACK`

The current product only performs user-triggered playback.

Configure the Expo Audio plugin explicitly:

```json
[
  "expo-audio",
  {
    "microphonePermission": false,
    "recordAudioAndroid": false,
    "enableBackgroundPlayback": false,
    "enableBackgroundRecording": false
  }
]
```

Remove the manually declared recording/background-media permissions from:

`android.permissions`

that are no longer required by the configured playback behavior.

Use Expo config/prebuild as the source of truth for native audio permissions.

Run:

```bash
npx expo config --type public
npx expo-doctor
```

and verify the generated Android permission set no longer contains `RECORD_AUDIO`.

---

# 17. Rating haptic refinement

Keep the centralized preference-aware haptics abstraction.

Change rating feedback to a lighter selection/tick semantic.

Use:

- rating selection → subtle selection/tick
- successful Hold-to-Focus → long-press/confirmation semantic already chosen
- successful destructive reset → stronger success/confirmation semantic

Keep the existing haptics-enabled preference gate.

Add/update unit tests around semantic event mapping rather than native implementation details.

---

# 18. FlashList / mounted-feed tests

Add unit tests for a pure mounted-occurrence merge helper.

Required cases:

## Append future positions

Existing:

`0,1,2,3,4,5`

incoming:

`3,4,5,6,7,8`

result:

`0,1,2,3,4,5,6,7,8`

## Replace same reel position

Existing reel 7 contains base card A.

Incoming refreshed reel 7 contains recurrence card B.

Result:

- reel 7 remains at the same array index
- card/key at reel 7 becomes B
- no duplicate reel 7 exists

## Incoming bounded window moves forward

Existing mounted list starts at reel 0.

Incoming service slice starts at reel 8.

Earlier mounted occurrences remain.

## Deterministic order

Merged results are always ascending by absolute `reelPosition`.

---

# 19. Infinite-feed controller tests

Add behavior/component-level coverage proving:

- proactive near-end activation requests extension
- FlashList `onEndReached` requests the same extension path
- simultaneous proactive + `onEndReached` triggers produce one in-flight extension
- extension adds future occurrences without changing the current occurrence index
- repeated extensions can grow across many batches without reaching an artificial terminal card

Use fake feed service results with absolute reel positions.

The test should prove continuity, not FlashList's own recycling internals.

---

# 20. Content invalidation tests

Add integration/presentation tests:

## Import into mounted Discovery

1. source contains deck A
2. Discovery hook/controller is already mounted
3. install deck B with result `installed`
4. content revision increments
5. `useFlashcards(null)` reloads
6. next extension receives A + B source cards

The current session ID stays unchanged.

## Deck update

An `updated` import also invalidates content.

## No-op import

A `no-op` result does not cause unnecessary revision churn.

---

# 21. Reset integration tests

Use real SQLite.

## Global reset

1. finalize rated reviews
2. verify learner profiles and memory states exist
3. create an active session with provisional rated/unrated attempts
4. reset all

Verify:

- profile statistics zero/reset
- all memory states removed
- active session removed
- provisional attempts/recurrences under that session removed by cascade
- deck and flashcard rows remain

Then prepare a new feed and verify the card has no scheduler memory state.

## Deck reset

With decks A and B:

- both have memory
- reset A

Verify:

- A memory removed
- B memory preserved
- A profile reset
- B profile preserved
- active mixed session invalidated
- focused A session invalidated when present

## Card reset

Verify only the selected card's profile/memory is reset while unaffected cards retain memory.

---

# 22. Pending-rating race regression test

Use a controllable fake/barrier around `rateAttempt`.

Scenario:

1. card is active
2. user chooses Again
3. rating persistence starts but is intentionally blocked
4. reel activation advances far enough that the attempt would be finalizable
5. activation reaches the rating barrier

Verify:

- finalization has not run yet

Then release the rating persistence.

Verify:

- attempt finalizes with Again
- it is not finalized as an unrated skip
- scheduler memory updates exactly once

This regression test is required.

---

# 23. Device/manual verification

Update:

`docs/manual-device-testing.md`

Add one short Phase 0 smoke sequence:

1. launch in dark and light/device theme
2. import a new deck while Discovery has already been opened
3. return to Discovery and keep swiping
4. confirm cards from the imported deck can appear without app restart
5. swipe through at least 30 reels in Discover
6. confirm there is no finite ending
7. swipe through at least 30 reels in Focus
8. watch specifically for same-card flicker at materialization boundaries
9. rapidly rate and swipe several cards
10. verify explicit ratings remain visible/correct
11. reset a deck, then confirm its cards behave as new learning state
12. reset all, then confirm installed decks remain
13. inspect Android app permissions and confirm microphone permission is absent

This is a smoke checklist, not an automated E2E suite.

---

# 24. Architecture boundaries

Preserve these responsibility boundaries.

## ReelFeedService

Owns:

- persisted session materialization
- scheduler-aware candidate generation
- bounded persisted range
- recurrence/base-feed merge

## Reel controller/presentation feed state

Owns:

- mounted accumulated occurrence collection
- merging refreshed prepared slices
- single-flight extension
- rating persistence barrier
- list callbacks

## FlashList

Owns:

- rendered-cell virtualization/recycling
- viewport list mechanics
- end-of-list signal

## Deck content revision

Owns:

- invalidating mounted content queries after package changes

## Learning reset transaction

Owns:

- atomic reset of learner statistics
- scheduler memory deletion
- active-session invalidation

---

# 25. Convention guardrails

Add only focused checks with long-term value.

## List implementation

The reel feed should import `FlashList` from `@shopify/flash-list`.

Keep ordinary smaller catalog/settings lists free to use their existing primitives.

## Content invalidation

Deck package import presentation code should invalidate through the deck-content abstraction rather than directly reaching into Discovery.

## Reset persistence

The presentation reset flow should call the application reset service/transaction rather than importing SQLite tables.

No broad new lint framework is needed.

---

# 26. Useful package/scripts

After installing FlashList, package installation should be performed through Expo:

```bash
npx expo install @shopify/flash-list
```

The existing full completion gate remains:

```bash
npm run verify
```

Add a focused runtime test command only if the new tests form a useful group, for example:

```json
"test:runtime-feed": "vitest run tests/unit/*reel* tests/behavior/*reel* tests/integration/*reset*"
```

Keep it only if it provides a materially faster development loop.

---

# 27. Recommended implementation sequence

Inspect the current implementation first, especially:

- `src/features/reels/presentation/components/reel-feed.tsx`
- `src/features/reels/presentation/hooks/use-reel-controller.ts`
- `src/features/reels/presentation/hooks/use-reel-feed.ts`
- `src/features/reels/application/reel-feed.service.impl.ts`
- `src/features/reels/application/reel-extension-policy.ts`
- `src/features/flashcards/presentation/hooks/use-flashcards.ts`
- `src/features/decks/presentation/hooks/use-import-deck-package.ts`
- `src/features/decks/presentation/hooks/use-deck-catalog.ts`
- `src/features/learner-profile/application/learner-profile.service.impl.ts`
- `src/features/learner-profile/infrastructure/sqlite-learner-profile.repository.ts`
- `src/features/learning-engine/infrastructure/sqlite-flashcard-memory-state.repository.ts`
- `src/features/study/**`
- `src/infrastructure/sqlite/schema.ts`
- `src/infrastructure/app-services.tsx`
- `app.json`
- current feed/reset/import/haptics tests

Then execute these finished steps.

## Step 1 — Learning reset correctness

- add reset transaction
- clear FSRS memory correctly
- invalidate active sessions
- wire current reset UI/service
- add SQLite integration tests
- run focused tests
- commit

## Step 2 — Deck-content invalidation

- add deck-content revision context
- invalidate on installed/updated package
- make flashcard/deck hooks revision-aware
- ensure mounted controller uses latest source cards
- add import/Discovery tests
- run focused tests
- commit

## Step 3 — Rating persistence barrier

- track pending rating persistence
- await it before finalization
- preserve activation ordering
- add race regression test
- run focused tests
- commit

## Step 4 — FlashList + stable mounted occurrences

- install FlashList using Expo
- add mounted occurrence merge helper
- migrate ReelFeed
- remove normal sliding-window scroll correction
- preserve restoration/anchor behavior
- add merge/continuity tests
- run focused tests
- commit

## Step 5 — Defensive infinite prefetch

- expose shared guarded extension request
- connect proactive threshold
- connect FlashList `onEndReached`
- add single-flight tests
- commit

## Step 6 — Platform cleanup

- configure `expo-audio` playback-only permissions
- verify microphone permission is gone
- lighten rating haptic semantic
- update tests
- commit

## Step 7 — Device checklist and verification

- update manual testing documentation
- run focused tests
- run `npm run verify`
- run Expo config/doctor checks
- resolve all failures
- final commit

Each numbered step should finish in a working state and receive a meaningful Git commit before the next step.

---

# 28. Completion criteria

This phase is complete when:

- global/deck/card reset removes the relevant FSRS memory as well as reporting state
- provisional pre-reset reviews cannot resurrect old memory
- importing/updating a deck refreshes mounted Discovery eligibility
- Discovery can use newly imported cards without app restart or session replacement
- explicit ratings cannot race finalization into becoming skips
- ReelFeed uses Expo-recommended FlashList
- mounted reel indexes remain stable as persisted windows advance
- repeated materialization does not visibly terminate the feed
- both proactive and `onEndReached` extension share one single-flight path
- current Focus/Discovery restoration and anchoring continue working
- microphone/recording permission is absent from the playback-only build
- rating haptics use a subtle selection semantic
- the new regression tests pass
- `npm run verify` passes
