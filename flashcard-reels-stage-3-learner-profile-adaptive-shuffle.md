# Flashcard Reels — Stage 3 Functional Specification

## Learner Profile, Adaptive Shuffle, and Progress

## 1. Purpose

Stage 3 adds a simple, durable learner model on top of the completed infinite-feed engine.

The goal is not to implement a scientific spaced-repetition scheduler.

The goal is:

> The application should remember how the user has performed on each flashcard across sessions and use that information to modestly improve future shuffled feeds.

After Stage 3, the core product should be usable as a persistent personal learning application:

- Discover is infinite and adaptive.
- Focus Shuffle is adaptive within the selected deck.
- Focus Ordered remains deterministic.
- short-term Again/Hard recurrence remains unchanged.
- learning progress survives session replacement and application restart.
- old operational history can be aggregated safely instead of growing forever.
- the user can inspect and reset learning progress.

## 2. Non-goals

Stage 3 does not introduce:

- FSRS;
- SM-2;
- exact due dates;
- stability/difficulty memory equations;
- machine learning;
- neural or opaque ranking;
- complex learning-state machines;
- mastery percentages;
- streak/gamification systems;
- advanced statistics dashboards;
- card-content versioning;
- synchronization;
- accounts/multiple learners;
- marketplace functionality;
- manual card/deck authoring;
- audio redesign;
- deck appearance redesign;
- Settings/preferences UI;
- Good/Easy long-distance scheduling redesign.

## 3. Core Architecture

Keep three concepts separate.

### Review attempts

Operational learning events answering: “What did the user do during this presentation?”

### Learner profile

Durable per-card state derived from finalized review attempts, answering: “What has the application learned about the user's history with this card?”

### Feed policy

Adaptive Shuffle consumes learner-profile facts and derives a selection weight, answering: “How strongly should this card participate in future normal Shuffle generation?”

The feed engine must not query learner-profile SQL tables directly. Repositories/services load profile data and provide typed learning state to the feed strategy.

## 4. Learner Profile Data

Add one durable learner-profile row per flashcard.

Because the application currently has one local learner, `flashcard_id` may be the primary key.

Recommended persisted facts:

```text
flashcard_id
review_count
again_count
hard_count
good_count
easy_count
first_reviewed_at
last_reviewed_at
reset_at
created_at
updated_at
```

All rating counters start at zero.

### Derived data

Do not persist adaptive selection weight as authoritative learner state.

Values such as adaptive weight, difficulty label, and priority label must be derived from durable facts. This allows the policy to change later without migrating historical learner data.

## 5. Profile Invariants

For every learner profile:

```text
review_count = again_count + hard_count + good_count + easy_count
```

Requirements:

- counters must never be negative;
- `firstReviewedAt <= lastReviewedAt` when both exist;
- a flashcard with no qualifying reviews behaves as a new card;
- learner state belongs to the flashcard, not to a study session;
- replacing/resetting a study session does not reset learner state;
- deleting a flashcard deletes its learner profile;
- deleting a deck cascades through its flashcards/profiles according to existing content ownership.

Use database constraints where reasonable and transactional application invariants where the operation spans multiple rows.

## 6. Exactly-once Incremental Aggregation

Finalized review attempts are aggregated into learner profiles incrementally.

Each qualifying finalized attempt contributes to the learner profile exactly once.

An editable attempt must never be aggregated. Changing a rating while the attempt remains editable must result in only its final rating being aggregated.

### Session aggregation checkpoint

Use the Stage 2 compaction/safe-boundary concept as the foundation for a per-session aggregation checkpoint.

The checkpoint represents:

> All qualifying finalized review attempts through absolute reel position X have been durably incorporated into learner profiles.

Rename the existing Stage 2 field/concept if necessary so its meaning is accurate.

The checkpoint must only advance in the same transaction that successfully updates the corresponding learner profiles.

Conceptually:

```text
BEGIN
read eligible finalized attempts after checkpoint and through safe boundary
discard attempts invalidated by a later profile reset boundary
group contributions by flashcard
upsert learner profiles
advance session aggregation checkpoint
COMMIT
```

If the transaction fails, neither profile state nor checkpoint advancement is committed. Retrying must not double-count ratings.

## 7. Aggregation Boundaries

### Active Discover

Discover never naturally completes. Aggregate only history that is finalized and older than the existing editable/recent-history retention boundary.

### Active Focus

The same safe-boundary rules may apply while Focus remains active.

### Completed/replaced/expired Focus

When a Focus session becomes permanently inactive, its remaining finalized attempts must not become stranded forever.

Once no further edits are possible for that completed session, aggregate all remaining qualifying finalized attempts and advance that session's checkpoint.

Aggregation must not depend exclusively on the currently visible feed.

## 8. Aggregation Triggering

Do not run a large aggregation job on every reel.

Use bounded incremental work.

Recommended triggers:

- when the configured aggregation interval has been crossed;
- when a Focus session is completed/replaced/expired;
- opportunistically on application/feed initialization for sessions known to have pending safe history.

Each aggregation run must have a bounded maximum range/chunk size. The exact interval/chunk size should be centralized configuration.

No normal application launch should scan all historical review attempts.

## 9. Progress Reset Semantics

Stage 3 introduces:

```text
resetCardProgress(flashcardId)
resetDeckProgress(deckId)
resetAllProgress()
```

Reset means: forget prior learner knowledge for the selected scope and treat future qualifying reviews as fresh learning history.

Reset must not:

- delete flashcard/deck content;
- delete appearance/customization;
- change prepared reel assignments;
- replace the current study session merely because progress was reset;
- alter unrelated application settings.

### Reset boundary

A reset must prevent older, not-yet-aggregated attempts from rebuilding the old profile afterward.

For each reset card:

- zero its profile counters and prior-learning timestamps;
- set `resetAt` to the reset time;
- preserve/create the zero-state profile row so the reset boundary remains durable.

Future aggregation ignores attempts at or before the relevant `resetAt`. Attempts after the reset contribute normally.

Time must be injectable in tests.

## 10. Adaptive Shuffle

Adaptive behavior applies to Discover Shuffle and Focus Shuffle. It does not alter Focus Ordered.

Goal:

- difficult cards receive modestly more normal Shuffle exposure;
- well-known cards receive less;
- new cards receive healthy exposure;
- no card becomes permanently unreachable.

### Simple weighted-bag policy

Use an explainable weighted bag rather than a scientific scheduler.

Each eligible card contributes a small integer number of copies/tickets to the next Shuffle bag.

Recommended initial selection multiplicity:

```text
New card:          2
High priority:     3
Normal priority:   2
Low priority:      1
```

Every eligible card contributes at least one copy, preventing starvation.

### Initial priority derivation

Map historical ratings internally for policy calculation:

```text
Again = 0
Hard  = 1
Good  = 2
Easy  = 3
```

For a reviewed card:

```text
average = (hard_count + good_count * 2 + easy_count * 3) / review_count
```

Initial mapping:

```text
average < 1.25           => High priority / 3 copies
1.25 <= average < 2.25   => Normal priority / 2 copies
average >= 2.25          => Low priority / 1 copy
```

New/unreviewed cards use 2 copies.

These thresholds are centralized product configuration and may be tuned later.

Do not persist the derived average, label, or copy count.

### Bag generation

For each new Shuffle bag:

1. load currently eligible cards;
2. load learner profiles for those card IDs in one batched operation;
3. derive selection multiplicity;
4. add each card to the bag the configured number of times;
5. Fisher-Yates shuffle the bag using injected RNG;
6. consume the bag sequentially;
7. when exhausted, rebuild using current eligible cards and current profiles.

Existing Stage 2 recurrence eligibility remains in force. If recurrence exclusion leaves no eligible candidates, preserve the Stage 2 no-dead-end fallback.

Avoid immediate duplicate bag-boundary repetition when practical for more-than-one-card sets, but do not create complex scheduling solely for this polish.

## 11. Interaction with Immediate Recurrence

Stage 2 recurrence remains the short-term correction mechanism.

Stage 3 adaptive weighting does not replace or reschedule recurrences.

A recurrence presentation generates its own review attempt. Once finalized and eligible for aggregation, that attempt contributes exactly once like any other review attempt.

Stage 3 does not interpret recurrence attempts differently during aggregation.

## 12. Ordered Focus

Ordered Focus remains profile-blind for selection.

Learner profiles are still updated from reviews performed in Ordered mode, but they do not reorder, skip, duplicate, or alter the ordered cursor.

## 13. Progress Tab

Add a top-level user-facing tab named **Progress**.

Navigation after Stage 3:

```text
Discover
Focus
Library
Progress
```

Settings may become separate later when enough actual preferences exist.

Progress answers: “What learning history has the application retained for me?”

It is not a settings screen and not an advanced analytics dashboard.

### Initial Progress view

Useful top-level facts:

- total cards;
- reviewed cards;
- unreviewed/new cards.

Provide deck-level grouping or filtering.

For a card, expose understandable facts such as:

- review count;
- Again count;
- Hard count;
- Good count;
- Easy count;
- last reviewed;
- derived adaptive priority: New / High / Normal / Low.

Avoid mastery percentages, fake scientific confidence, streaks/gamification, and unnecessary charts.

### Contextual navigation

Progress should support viewing progress for a particular deck. Library may later link into Progress filtered to that deck without duplicating profile logic.

This contextual Library-to-Progress entry point is optional in Stage 3; the top-level Progress tab is required.

## 14. Reset UI

Progress is the natural home for learning-progress resets.

Support:

- reset one card;
- reset one deck;
- reset all progress.

Destructive reset actions require clear confirmation stating that progress is reset but cards/decks are not deleted.

Do not place unrelated application preferences in Progress.

## 15. Profile Explanation / Observability

Make adaptive behavior explainable.

Create one pure policy/explanation function used by both Shuffle and Progress.

Conceptually:

```text
status: High priority
reviews: 12
Again: 3
Hard: 4
Good: 4
Easy: 1
selectionCopies: 3
reason: "Historical reviews contain a high share of Again/Hard ratings."
```

Do not duplicate priority formulas in UI code.

A developer-facing explanation may expose more detail than the user-facing Progress row.

## 16. Repository/API Direction

Introduce explicit learner-profile interfaces.

Likely capabilities:

```text
findByFlashcardId
findByFlashcardIds
upsertAggregatedContributions
resetCard
resetDeck
resetAll
```

Prefer batched reads for feed generation. Do not perform N+1 profile queries.

The feed engine receives typed candidate/profile state rather than concrete repositories.

## 17. Operational History Cleanup

Actual destructive cleanup is allowed only after aggregation correctness is established.

### First milestone

Implement profile aggregation, transactional checkpoint advancement, reset boundaries, and tests. Keep detailed rows initially if this makes correctness easier to validate.

### Cleanup milestone

Once tests prove aggregation/retry/reset behavior, old operational rows that are finalized, aggregated, older than retained recent history, and not needed by recurrence/session invariants may be deleted in bounded chunks.

Never delete an attempt before its contribution is durably reflected in the learner profile or intentionally invalidated by reset semantics.

## 18. Functional Requirements Summary

Stage 3 is complete when:

- every flashcard can have durable learner facts;
- finalized attempts aggregate exactly once;
- editable attempts are never prematurely aggregated;
- aggregation works for infinite Discover and replaceable Focus sessions;
- checkpoints advance atomically with profile updates;
- reset cannot be undone by old unaggregated attempts;
- Discover Shuffle uses profile-derived weighted bags;
- Focus Shuffle uses profile-derived weighted bags;
- Ordered Focus remains deterministic;
- immediate Stage 2 recurrence remains intact;
- new cards and low-priority cards remain reachable;
- Progress shows understandable per-card/deck learning facts;
- user can reset card/deck/all progress;
- profile loading is batched;
- old operational history has a safe path to bounded cleanup.

## 19. Non-functional Requirements

### Local-first

All behavior works offline using existing SQLite/Drizzle.

### Determinism

With the same candidate cards, learner profiles, strategy state, injected RNG, and injected clock, behavior must be reproducible in tests.

### Explainability

Adaptive selection must be understandable from durable profile facts.

### Bounded work

Normal feed opening/generation must not scan all historical attempts. Profile reads are batched. Aggregation and cleanup operate in bounded chunks.

### Transactional integrity

Profile aggregation + checkpoint advancement are atomic. Reset operations are transactional for their scope.

### Idempotency

Retrying aggregation cannot double-count.

### Separation of concerns

Content remains separate from learner state; profiles remain separate from sessions; feed policy remains separate from profile persistence; Progress remains separate from Settings.

### Type safety

Use explicit domain/application types and avoid unsafe casts/generic structures where data has meaningful shape.

### Testability

Aggregation and adaptive-weight policy must be testable without React Native rendering.

## 20. Required Behavioral Tests

### Aggregation

- finalized Again/Hard/Good/Easy increment correct counters;
- editable attempt is not aggregated;
- changed editable rating contributes only final rating;
- retry does not double-count;
- checkpoint advances only with successful profile update;
- completed Focus aggregates remaining qualifying history;
- Discover aggregates incrementally while active.

### Reset

- card reset zeroes profile and establishes reset boundary;
- pre-reset unaggregated attempts do not repopulate profile;
- post-reset attempts aggregate normally;
- deck reset affects only that deck;
- all reset affects all profiles;
- reset does not delete content;
- reset does not mutate prepared reels.

### Adaptive Shuffle

- new cards receive configured multiplicity;
- struggling cards receive higher multiplicity;
- strong cards receive lower multiplicity;
- every eligible card receives at least one bag entry;
- injected RNG gives deterministic order;
- recurrence eligibility still applies;
- all-reserved fallback prevents dead ends;
- Ordered is unaffected.

### Persistence/reconstruction

- profile survives fresh service/repository reconstruction;
- aggregation checkpoint survives;
- reset boundary survives.

### Query behavior

- profile loading for candidate sets is batched;
- aggregation processes bounded ranges rather than full history.

Use real SQLite integration tests for database/transaction invariants.

## 21. Suggested Implementation Sequence

### Step 1 — Learner-profile schema and repository

- profile table;
- indexes/constraints;
- domain types;
- batched reads;
- reset boundary;
- SQLite tests.

### Step 2 — Aggregation transaction

- safe-range attempt query;
- grouped contributions;
- profile upserts;
- checkpoint advancement;
- exactly-once/idempotency tests.

### Step 3 — Aggregation lifecycle integration

- active Discover interval trigger;
- active Focus safe-range trigger;
- completed Focus final aggregation;
- reconstruction tests.

### Step 4 — Adaptive Shuffle policy

- pure priority/multiplicity function;
- weighted-bag generation;
- injected RNG;
- Discover + Focus Shuffle integration;
- Ordered unchanged.

### Step 5 — Progress tab

- cross-library profile view;
- deck filtering/grouping;
- per-card facts;
- priority explanation.

### Step 6 — Reset UI

- card reset;
- deck reset;
- all reset;
- confirmation;
- reset-boundary tests.

### Step 7 — Optional safe cleanup

Only after aggregation/reset correctness is established: bounded deletion of safely aggregated old operational rows while retaining recent/editable history.

### Step 8 — Consolidation

Full validation, long-running behavior test, Knip/lint/conventions, then freeze Stage 3.

## 22. Stage 3 Completion Criteria

Stage 3 is ready to freeze when:

- durable learner profiles exist;
- aggregation is exactly-once and transactional;
- profile reset semantics are correct;
- adaptive weighted Shuffle works in Discover and Focus;
- Ordered remains unchanged;
- Progress gives useful visibility into retained learning state;
- feed/profile queries remain bounded and batched;
- current recurrence/session invariants remain intact;
- tests protect restart, aggregation, reset, and adaptive selection;
- no sophisticated spaced-repetition algorithm is required.

At that point, the core personal-learning product is considered complete enough for regular use. Later work should primarily be product refinement, convenience, richer scheduling, content tooling, and platform expansion.
