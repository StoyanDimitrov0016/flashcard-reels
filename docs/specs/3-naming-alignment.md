# 3 - Naming alignment before the next release

Status: ready for owner review. A set of renames with no change in what the learner can do.

## Problem and value

The code, the database, and the screens use different words for the same things: `RecallLevel`
and `LearningRating` for one rating, "finalize" for what the owner calls commit, `mixed` and
`focused` for Discover and Focus, and "Controls" for the Settings destination. Several tables use
another table's ID as their primary key. The next release starts every install with a fresh
database, so it is the cheapest moment to settle table and column names: after it, each rename
means wiping the owner's study data again.

This spec applies one vocabulary everywhere and adds no features.

## Branches

Each part is its own branch. Each branch starts from the previous part's branch, so the parts
can be done in one go; the owner merges them into `develop` in this order.

| Part                          | Branch                       | Starts from                                |
| ----------------------------- | ---------------------------- | ------------------------------------------ |
| 1. Code and UI names          | `refactor/names-code-and-ui` | `chore/naming-alignment` (holds this spec) |
| 2. Commit instead of finalize | `refactor/names-commit`      | `refactor/names-code-and-ui`               |
| 3. Database names and IDs     | `refactor/names-database`    | `refactor/names-commit`                    |
| 4. Backup document            | `refactor/names-backup`      | `refactor/names-database`                  |

Part 5 is a final check on `refactor/names-backup`, with a docs commit there if needed.

## Rules for the whole task

1. **No behavior change** beyond what a part states. What the learner can do, what is scheduled,
   what is stored, and what is shown stay the same, under the new names.
2. **Rename only what is listed.** In particular, the word "controls" for UI controls (the Study
   Island controls, `study-controls-sheet.tsx`, `recall-controls.tsx`) stays. Only the
   **destination** called Controls becomes Settings. Library, Progress, and Reading keep their
   names; merging Library and Progress is a later spec.
3. **Work in the order below.** Create the part's branch, finish the part, run its checks, and
   make one commit on that branch with the message given. Do not push and do not merge.
4. **Tests follow the names, not the other way round.** Update tests to the new names; do not
   weaken or delete a test to make a part pass. Remove only tests that exercised something this
   spec removes.
5. **Stop and report** if the code does not match what this spec describes, instead of guessing.
6. **The backup document is frozen until Part 4.** In Parts 1 to 3, the JSON field names of
   the progress backup (`reviewEvents`, `resolution`, `finalizedAt`, and the rest) stay as they
   are, in `src/features/progress-backup/contracts/progress-backup.schema.ts`, the backup
   fixtures, and every test that builds a backup document. When a part renames an internal
   name, the export query and the restore transaction map the new internal name to the
   unchanged JSON field. Part 4 then renames the JSON fields.
7. **Searches are exact.** Every "searching … finds nothing" check means a whole-word search,
   for example `rg -w review_events src tests`, so `flashcard_review_events` does not match
   `review_events`. A name ending in `_` is a prefix check: `rg '\breview_attempts_' src tests`.
   Each check lists the places it excludes.
8. Follow `AGENTS.md` and `docs/codebase-preferences.md`. Run commands from `apps/mobile` unless
   stated.

## Part 1: code and UI names, no database change

### 1.1 One rating type

`RecallLevel` (`src/features/study/domain/recall-level.ts`) and `LearningRating`
(`src/features/learning-engine/domain/learning-scheduler.ts`) are the same four values. Replace
both with one type:

- Create `src/features/learning-engine/domain/rating.ts` exporting
  `type Rating = "again" | "hard" | "good" | "easy"`, and a matching Zod schema if either old
  type had one.
- Use `Rating` everywhere either old type was used, and delete `recall-level.ts`.
- Rename identifiers that carry the old words, such as `recallLevel` to `rating`, where the name
  refers to this type.

### 1.2 Flashcard audio

The audio reads the whole card, not only the answer. Rename:

| Now                                                                                         | New                                                                                                 |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `answer-audio.service.impl.ts`, `answer-audio.repository.ts`, `answer-audio.service.ts`     | `flashcard-audio.service.impl.ts`, `flashcard-audio.repository.ts`, `flashcard-audio.service.ts`    |
| `answer-audio-player.tsx`, `use-card-answer-audio-source.ts`, `use-answer-audio.ts`         | `flashcard-audio-player.tsx`, `use-flashcard-audio-source.ts`, `use-flashcard-audio.ts`             |
| `AnswerAudioService`, `AnswerAudioServiceImpl`, `AnswerAudioRepository`                     | `FlashcardAudioService`, `FlashcardAudioServiceImpl`, `FlashcardAudioRepository`                    |
| `AnswerAudioPlayer`, `AnswerAudioPlayerProps`, `useAnswerAudio`, `useCardAnswerAudioSource` | `FlashcardAudioPlayer`, `FlashcardAudioPlayerProps`, `useFlashcardAudio`, `useFlashcardAudioSource` |

### 1.3 Preferences

In `src/features/preferences`:

| Now                                                           | New                                          |
| ------------------------------------------------------------- | -------------------------------------------- |
| `recollectionIslandPosition`, `RecollectionIslandPosition`    | `studyIslandPosition`, `StudyIslandPosition` |
| `appearance`, `AppearancePreference` (light, dark, or device) | `colorMode`, `ColorMode`                     |
| UI section title "Appearance" in the settings screen          | "Color mode"                                 |
| storage key `flashcard-reels.preferences.v1`                  | `flashcard-reels.preferences.v2`             |

The new storage key means existing development installs start with default preferences. That is
intended; do not add code that reads the old key. Deck themes (`DeckTheme…`) keep their names.

### 1.4 Discover and Settings on screen

- The feed header label "For you" becomes **"Discover"**
  (`src/features/reels/presentation/components/study-feed-header.tsx`).
- The Controls destination becomes **Settings**:
  - route `src/app/(tabs)/controls.tsx` becomes `settings.tsx`, and the destination name in
    `src/app/(tabs)/_layout.tsx` changes to match, including the tab item key and its
    accessibility label ("Settings tab");
  - `src/features/preferences/presentation/screens/controls-screen.tsx` becomes
    `settings-screen.tsx`, and its component and title become Settings;
  - every "Back to Controls" becomes "Back to Settings" (archived progress and progress backup
    screens);
  - `src/shared/presentation/components/view-error-boundary.tsx` maps `/settings` instead of
    `/controls`;
  - user-visible text that points to the destination, such as "switched on in Controls" in
    `study-controls-sheet.tsx`, says Settings.
- Update `apps/mobile/.maestro`: selectors "Controls tab" and the stale "You tab" become
  "Settings tab", and assertions on the "Controls" title become "Settings".

### Part 1 checks and commit (branch `refactor/names-code-and-ui`)

- Searching `src`, `tests`, and `.maestro` for `RecallLevel`, `LearningRating`, `AnswerAudio`,
  `answer-audio`, `recollectionIsland`, `RecollectionIsland`, `"For you"`, `You tab`,
  `Controls tab`, and `controls-screen` finds nothing.
- `npm run check` and `npm test` pass.
- Commit: `refactor(mobile): align ratings, audio, preferences, and destination names`.

## Part 2: commit instead of finalize, code only

The owner's words: a rating is **uncommitted** while its card is inside the editable window, and
**committed** when it leaves. Rename "finalize" to "commit" in code. Column names change in
Part 3.

| Now                                                                                                                                                                                               | New                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review-attempt-finalization-order.ts`, `review-attempt-finalization-transaction.ts`, `sqlite-review-attempt-finalization-transaction.ts`, `tests/unit/review-attempt-finalization-order.test.ts` | `review-attempt-commit-order.ts`, `review-attempt-commit-transaction.ts`, `sqlite-review-attempt-commit-transaction.ts`, `tests/unit/review-attempt-commit-order.test.ts`        |
| `ReviewAttemptFinalizationTransaction`, `SQLiteReviewAttemptFinalizationTransaction`, `TrackingFinalizationTransaction`, `reviewAttemptFinalizationTransaction`, `finalizationTransaction`        | `ReviewAttemptCommitTransaction`, `SQLiteReviewAttemptCommitTransaction`, `TrackingCommitTransaction`, `reviewAttemptCommitTransaction`, `commitTransaction`                     |
| `finalizeAttempt`, `finalizeAttemptNow`, `finalizeAttempts`, `finalizeAllAttempts`, `finalizeAttemptsInOrder`, `finalizeAttemptsOutsideEditableWindow`, `finalizeAndAggregateCompletedSession`    | `commitAttempt`, `commitAttemptNow`, `commitAttempts`, `commitAllAttempts`, `commitAttemptsInOrder`, `commitAttemptsOutsideEditableWindow`, `commitAndAggregateCompletedSession` |
| `orderReviewAttemptsForFinalization`, `serializeFinalization`, `finalizationQueues`, `clearFinalizationQueue`, `failFinalizationForTest`, `trackingFinalization`                                  | `orderReviewAttemptsForCommit`, `serializeCommit`, `commitQueues`, `clearCommitQueue`, `failCommitForTest`, `trackingCommit`                                                     |
| `listUnfinalizedBySessionId`, `listUnfinalizedBeforeReelPosition`, `allUnfinalized`                                                                                                               | `listUncommittedBySessionId`, `listUncommittedBeforeReelPosition`, `allUncommitted`                                                                                              |
| the TypeScript property `finalizedAt` and local names such as `finalizedAttempt`                                                                                                                  | `committedAt`, `committedAttempt`, and so on                                                                                                                                     |

Keep the Drizzle column mapping pointing at the existing `finalized_at` columns in this part,
for example `committedAt: text("finalized_at")`.

### Part 2 checks and commit (branch `refactor/names-commit`)

- Searching `src` and `tests` for `finaliz` (a plain substring search, `rg -i finaliz`) finds
  only: the `"finalized_at"` column strings in `schema.ts`, and the backup document's
  `finalizedAt` field in `src/features/progress-backup` and in tests that build a backup
  document (rule 6).
- `npm run check` and `npm test` pass.
- Commit: `refactor(mobile): call finalized review attempts committed`.

## Part 3: database names and IDs, one baseline

### 3.1 Tables, columns, and values

| Now                                                                              | New                                |
| -------------------------------------------------------------------------------- | ---------------------------------- |
| table `review_events`                                                            | `flashcard_review_events`          |
| table `removed_decks`                                                            | `dismissed_bundled_decks`          |
| table `study_session_items`                                                      | `study_session_reels`              |
| column `finalized_at` in `flashcard_review_attempts` and the review events table | `committed_at`                     |
| column `deck_progress.resolution`                                                | `status`                           |
| `study_sessions.scope` values `mixed`, `focused`                                 | `discover`, `focus`                |
| indexes and constraints named `review_attempts_*`                                | `flashcard_review_attempts_*`      |
| every index or constraint on a renamed table                                     | prefixed with the table's new name |

Rename the matching TypeScript names: `reviewEvents` to `flashcardReviewEvents`, `removedDecks`
to `dismissedBundledDecks` (and `RemovedDeck…` to `DismissedBundledDeck…`), `studySessionItems`
to `studySessionReels` (and `StudySessionItem…` to `StudySessionReel…`), `resolution` to
`status`, and `StudySessionScope` values to `"discover" | "focus"` everywhere, including
`StudySessionScopeSchema`, `study.service.impl.ts`, and the feed scope code. `dismissed_bundled_decks`
keeps today's behavior: it is still written for every removed deck.

### 3.2 Every table has its own `id`

Every table's primary key is `id`. A column pointing at another table's row is
`<resource>_id`, `UNIQUE` when the relationship is one-to-one.

| Table                       | Now                                  | New                                     |
| --------------------------- | ------------------------------------ | --------------------------------------- |
| `flashcard_progress`        | primary key `flashcard_id`           | `id` primary key; `flashcard_id` unique |
| `flashcard_memory_states`   | primary key `flashcard_id`           | `id` primary key; `flashcard_id` unique |
| `deck_progress`             | primary key `deck_id`                | `id` primary key; `deck_id` unique      |
| `dismissed_bundled_decks`   | primary key `id` holding the deck ID | `id` primary key; `deck_id` unique      |
| `study_session_recurrences` | `source_attempt_id`                  | `flashcard_review_attempt_id`           |

Generate new IDs in the app with the existing `IdGenerator`, as `deck_theme_selections` does.
The backup document does not carry these IDs, now or in Part 4: no other table references
them. The restore transaction generates a new `id` for every row it inserts into these tables,
with an injected `IdGenerator`.
Upserts that targeted the old primary key target the unique `<resource>_id` column instead.
These tables keep having no foreign keys where they have none today.

### 3.3 Leftover defaults and the schema object

- Remove the column defaults on `decks.author_id`, `decks.package_schema`, and `decks.revision`;
  the installer always sets them. Delete `src/features/decks/domain/system-author.ts` if nothing
  else uses `SYSTEM_AUTHOR_ID`.
- Add `progressBackupState` to the exported `databaseSchema` object in `schema.ts`.

### 3.4 Baseline

Follow "Database changes" in `docs/development.md` or `docs/monorepo.md`, whichever exists:
delete `drizzle/0000_*.sql` and `drizzle/meta/*`, run `npx drizzle-kit generate`, keep
`drizzle/migrations.js` in the repository's style, rename `DATABASE_NAME` to
`flashcard-reels-v5.db`, and add it to `DATABASE_FILES` in `src/infrastructure/app-recovery.ts`
and to its test.

### Part 3 checks and commit (branch `refactor/names-database`)

- Whole-word searches of `src` and `tests` (rule 7) for `review_events`, `reviewEvents`,
  `removed_decks`, `removedDecks`, `study_session_items`, `studySessionItems`,
  `StudySessionItem`, `finalized_at`, `resolution`, `source_attempt_id`, `SYSTEM_AUTHOR_ID`, and
  the string `"mixed"` find nothing, except the backup document's JSON fields
  `reviewEvents` and `resolution` in `src/features/progress-backup` and in tests that build a
  backup document (rule 6).
- The prefix search `rg '\breview_attempts_' src tests` finds nothing.
- The string `"focused"` remains only where it means UI focus, not the session scope.
- `drizzle` holds one `0000` migration, and `npm run db:check` passes.
- `npm run check` and `npm test` pass.
- Commit: `refactor(mobile): align table names and give every table its own id`.

## Part 4: backup document

The backup format follows the new names. It stays `version: 1` and changes directly; backups from
earlier development builds are rejected.

| Now                         | New                     |
| --------------------------- | ----------------------- |
| `reviewEvents`              | `flashcardReviewEvents` |
| `deckProgress[].resolution` | `deckProgress[].status` |
| review event `finalizedAt`  | `committedAt`           |

- Rows keep having no `id` field; restore already generates IDs (Part 3).
- Update `src/features/progress-backup/contracts/progress-backup.schema.ts`, the export query,
  the restore transaction, and every validation rule that names these fields. Keep every rule.
- Update the fixture `.maestro/fixtures/progress-backup.json` and any integration-test fixture
  so they match the new document and still pass validation.

### Part 4 checks and commit (branch `refactor/names-backup`)

- Whole-word searches of `src`, `tests`, and `.maestro/fixtures` for `reviewEvents`,
  `resolution`, and `finalizedAt` find nothing, and `rg -i finaliz src tests` finds nothing at all.
- `npm run check` and `npm test` pass, including `progress-backup.integration.test.ts`.
- Commit: `refactor(mobile): align the backup document with the new names`.

## Part 5: final verification

No transitional code from this spec remains: no Drizzle mapping from a renamed property to an
old column name, and no mapping between internal names and old backup field names.

From the repository root: `npm run check`, `npm test`, and `npm run check:dead-code` pass. In
`apps/mobile`: `npm run db:check` and `npm run decks:check` pass. Update any doc in `docs/` that
names a renamed table, type, route, or label, in the same commit.

Commit: `docs: use the aligned names` (skip if no doc needed a change).

Report: each branch with its commit, anything left out and why, and every place where the code
did not match this spec.

## Out of scope

Everything under "End state" below, and any change to scheduling, the editable window, or
recurrences.

## End state

This spec is one step toward the target data model the owner has agreed on. The owner wants
the target fully implemented in the end; these parts of it are still to come, each in a later
spec:

- **Computed progress.** Card counts and a deck's last studied time are computed from events;
  `flashcard_progress`, aggregation, and `aggregated_through_reel_position` are removed, after
  a benchmark on the owner's phone (5,000 cards, 100,000 review events, counts under 50 ms).
- **Review timing.** Attempts and review events record `appeared_at`, `revealed_at`, and
  `rated_at`; review events' `reviewed_at` becomes `rated_at`.
- **Skip events.** A card committed without a rating writes a `flashcard_skip_events` row.
- **Recurrences at commit.** A recurrence is created when its attempt commits, never from an
  uncommitted rating.
- **Lesson read events.** `lesson_read_events`, Mark as read and Mark as revisited, and deck
  progress created by a read.
- **`has_audio`** on `flashcards`, from the package's `audio` flag.
- **Learner data in one database.** Preferences move from Expo's key-value store into a
  `learner_preferences` table with checked values; the key-value store is removed.
- **Deck theme selections as learner data.** No foreign key to `decks`, kept when a deck is
  removed, deleted by Start fresh or deleting an archive, included in backups, and an unknown
  stored theme falls back to the default.
- **`dismissed_bundled_decks`** is written only when a bundled deck is removed.
- **One owner for learner data.** One module owns deleting and keeping a deck's learner data,
  used by removal, deck reset, reset everything, Start fresh, and deleting an archive.
- **Allowed values checked in SQLite.** Every column with a fixed set of values has a `CHECK`.
- **Backup as learner data.** The backup is renamed to `flashcard-reels-learner-data` and holds
  learning progress, preferences, and deck theme selections.
- **Navigation.** Library and Progress merge into Decks.

## Hard-to-reverse decisions

1. The vocabulary: Rating, flashcard audio, study island, color mode, Discover, Settings, commit.
2. The table names, the `discover`/`focus` scope values, and `deck_progress.status`.
3. Every table has its own `id`; references are `<resource>_id`.
4. The backup document's new field names. Backup rows carry no table IDs; restore generates them.

## Acceptance

Each part's checks pass on its own branch, in order, with one commit per part. On a device, a fresh install shows
Discover and Focus in the header and Settings in the bottom bar, studying and rating work, and a
progress backup exports and imports.

## Time budget

Two evenings.

## Open questions

None.
