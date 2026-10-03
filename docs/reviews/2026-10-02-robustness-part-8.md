# Part 8: names and dead members

Branch: `chore/names-and-dead-members`.

Signals: transaction files using `-transaction.ts` 14 -> 0; preferences alias
files 1 -> 0 (6 production imports and 1 test mock moved); distinct identifiers
longer than 35 characters 30 -> 20 across mobile source, tests, and scripts
(source alone: 29 -> 20). Ten names changed; all twenty retained names are below.

No behavior or SQL changes. File imports and the preference mock now use the
real provider hook. Existing behavioral tests protect the renamed boundaries;
no tests were added solely to mirror a filename or identifier.

Validation: mobile check and all 467 mobile tests pass. Root check, tests
(467 mobile + 40 web + 31 contract tests), and dead-code check pass.
Database and deck checks pass.
Migration files, including the canonical baseline, are unchanged.

## Transaction files

Every file below now uses `.transaction.ts`; only filenames and imports changed.

| Previous path                                                                                                     | New basename                                           |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `apps/mobile/src/features/flashcard-progress/application/flashcard-progress-aggregation-transaction.ts`           | `flashcard-progress-aggregation.transaction.ts`        |
| `apps/mobile/src/features/flashcard-progress/application/learning-progress-reset-transaction.ts`                  | `learning-progress-reset.transaction.ts`               |
| `apps/mobile/src/features/flashcard-progress/infrastructure/sqlite-flashcard-progress-aggregation-transaction.ts` | `sqlite-flashcard-progress-aggregation.transaction.ts` |
| `apps/mobile/src/features/flashcard-progress/infrastructure/sqlite-learning-progress-reset-transaction.ts`        | `sqlite-learning-progress-reset.transaction.ts`        |
| `apps/mobile/src/features/study/application/review-attempt-commit-transaction.ts`                                 | `review-attempt-commit.transaction.ts`                 |
| `apps/mobile/src/features/study/application/review-attempt-transaction.ts`                                        | `review-attempt.transaction.ts`                        |
| `apps/mobile/src/features/study/application/study-session-feed-transaction.ts`                                    | `study-session-feed.transaction.ts`                    |
| `apps/mobile/src/features/study/application/study-session-lifecycle-transaction.ts`                               | `study-session-lifecycle.transaction.ts`               |
| `apps/mobile/src/features/study/application/study-session-maintenance-transaction.ts`                             | `study-session-maintenance.transaction.ts`             |
| `apps/mobile/src/features/study/infrastructure/sqlite-review-attempt-commit-transaction.ts`                       | `sqlite-review-attempt-commit.transaction.ts`          |
| `apps/mobile/src/features/study/infrastructure/sqlite-review-attempt-transaction.ts`                              | `sqlite-review-attempt.transaction.ts`                 |
| `apps/mobile/src/features/study/infrastructure/sqlite-study-session-feed-transaction.ts`                          | `sqlite-study-session-feed.transaction.ts`             |
| `apps/mobile/src/features/study/infrastructure/sqlite-study-session-lifecycle-transaction.ts`                     | `sqlite-study-session-lifecycle.transaction.ts`        |
| `apps/mobile/src/features/study/infrastructure/sqlite-study-session-maintenance-transaction.ts`                   | `sqlite-study-session-maintenance.transaction.ts`      |

## Every long identifier after Parts 5-7

The inventory scans AST identifier tokens in authored mobile `.ts`, `.tsx`,
`.js`, and `.mjs` files, deduplicates names, and excludes prose/string literals.
Locations below point to the current declaration after renaming.

| Before                                                | Decision and result                       | Reason                                                                                         | Current declaration                                                                                                  |
| ----------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `CreateFlashcardProgressServiceOptions` (37)          | Kept                                      | Keep the named factory-options convention and cross-feature qualification.                     | `apps/mobile/src/infrastructure/composition/create-flashcard-progress-service.ts:12`                                 |
| `FlashcardProgressAggregationTransaction` (39)        | Kept                                      | Keep the cross-feature unit-of-work port name, matching its SQLite adapter.                    | `apps/mobile/src/features/flashcard-progress/application/flashcard-progress-aggregation.transaction.ts:6`            |
| `LearningProgressRevisionContextValue` (36)           | Kept                                      | Keep the provider context qualification.                                                       | `apps/mobile/src/features/flashcard-progress/presentation/context/learning-progress-revision-context.tsx:3`          |
| `LearningProgressRevisionProviderProps` (37)          | Kept                                      | Keep the component-name + Props convention.                                                    | `apps/mobile/src/features/flashcard-progress/presentation/context/learning-progress-revision-context.tsx:12`         |
| `PENDING_COMPLETED_SESSION_RECOVERY_LIMIT` (40)       | Kept                                      | Keep the distinct recovery/history policy; its words are not redundant in review-attempts.     | `apps/mobile/src/features/study/domain/review-attempts.ts:13`                                                        |
| `PERSISTED_SESSION_FEED_HISTORY_LIMIT` (36)           | Kept                                      | Keep the distinct recovery/history policy; its words are not redundant in review-attempts.     | `apps/mobile/src/features/study/domain/review-attempts.ts:6`                                                         |
| `ProgressBackupDocumentUncompiledSchema` (38)         | Changed to `UncompiledDocumentSchema`     | The progress-backup schema module supplies the backup qualification.                           | `apps/mobile/src/features/progress-backup/contracts/progress-backup.schema.ts:94`                                    |
| `SQLiteDeckPackageInstallationTransaction` (40)       | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction.ts:32`          |
| `SQLiteDismissedBundledDeckRepository` (36)           | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/decks/infrastructure/sqlite-dismissed-bundled-deck.repository.ts:9`                        |
| `SQLiteFlashcardMemoryStateRepository` (36)           | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/learning-engine/infrastructure/sqlite-flashcard-memory-state.repository.ts:10`             |
| `SQLiteFlashcardProgressAggregationTransaction` (45)  | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/flashcard-progress/infrastructure/sqlite-flashcard-progress-aggregation.transaction.ts:28` |
| `SQLiteLearningProgressResetTransaction` (38)         | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/flashcard-progress/infrastructure/sqlite-learning-progress-reset.transaction.ts:19`        |
| `SQLiteProgressBackupRestoreTransaction` (38)         | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/progress-backup/infrastructure/sqlite-progress-backup-restore.transaction.ts:23`           |
| `SQLiteReviewAttemptCommitTransaction` (36)           | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/study/infrastructure/sqlite-review-attempt-commit.transaction.ts:26`                       |
| `SQLiteSavedProgressContinuationTransaction` (42)     | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/decks/infrastructure/sqlite-saved-progress-continuation.transaction.ts:10`                 |
| `SQLiteSavedProgressDeletionTransaction` (38)         | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/decks/infrastructure/sqlite-saved-progress-deletion.transaction.ts:11`                     |
| `SQLiteStudySessionLifecycleTransaction` (38)         | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/study/infrastructure/sqlite-study-session-lifecycle.transaction.ts:13`                     |
| `SQLiteStudySessionMaintenanceTransaction` (40)       | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/study/infrastructure/sqlite-study-session-maintenance.transaction.ts:8`                    |
| `SQLiteStudySessionRecurrenceRepository` (38)         | Kept                                      | Keep the required SQLite<Port> adapter class pattern.                                          | `apps/mobile/src/features/study/infrastructure/sqlite-study-session-recurrence.repository.ts:9`                      |
| `SavedProgressContinuationTransaction` (36)           | Kept                                      | Keep the cross-feature unit-of-work port name, matching its SQLite adapter.                    | `apps/mobile/src/features/decks/application/saved-progress-continuation.transaction.ts:3`                            |
| `cancelPendingByFlashcardReviewAttemptId` (39)        | Changed to `cancelPendingByAttemptId`     | The attempt type and study repository supply the review/card context.                          | `apps/mobile/src/features/study/domain/study-session-recurrence.repository.ts:4`                                     |
| `consumePreparedFocusedFeedTransition` (36)           | Changed to `consumePreparedTransition`    | The focused-feed screen already supplies focus/feed context.                                   | `apps/mobile/src/features/reels/presentation/screens/focused-feed-screen.tsx:54`                                     |
| `findCompletedSessionsPendingAggregation` (39)        | Changed to `findCompletedPending`         | The session aggregation query already supplies session/aggregation context.                    | `apps/mobile/src/features/study/domain/study-session-aggregation.query.ts:5`                                         |
| `findCompletedSessionsPendingAggregationForDeck` (46) | Changed to `findCompletedPendingForDeck`  | The session aggregation query already supplies session/aggregation context.                    | `apps/mobile/src/features/study/domain/study-session-aggregation.query.ts:6`                                         |
| `findIncludingPendingRatingsByFlashcardIds` (41)      | Changed to `findIncludingPendingRatings`  | The flashcard-progress query and its ID parameter supply card identity.                        | `apps/mobile/src/features/flashcard-progress/domain/flashcard-progress.query.ts:4`                                   |
| `flashcardProgressAggregationTransaction` (39)        | Changed to `progressAggregation`          | Its declared transaction type supplies the repeated qualification.                             | `apps/mobile/src/features/study/application/study-session-operations.ts:46`                                          |
| `listPendingFlashcardIdsFromTargetPosition` (41)      | Changed to `listPendingCardIdsFromTarget` | The recurrence query and target-position parameter supply the repeated qualification.          | `apps/mobile/src/features/study/domain/study-session-recurrence.repository.ts:7`                                     |
| `listReviewAttemptsInReelPositionRange` (37)          | Changed to `listAttemptsInRange`          | The SQLite study fixture and typed repository supply review/session context.                   | `apps/mobile/tests/integration/deck-package-installation.integration.test.ts`                                        |
| `recoverPendingCompletedSessionAggregation` (41)      | Changed to `recoverPendingAggregation`    | The session operations module supplies session context; retain the pending-aggregation intent. | `apps/mobile/src/features/study/application/study-session-operations.ts:209`                                         |
| `synchronizeRotationWithRevealedState` (36)           | Kept                                      | Keep the meaningful lifecycle purpose; it does not repeat the module/type.                     | `apps/mobile/src/features/reels/presentation/components/reel-card.tsx:162`                                           |

## Deviations

- The source-only inventory has 29 long names. Including tests/scripts adds one
  fixture member, `listReviewAttemptsInReelPositionRange`, which is also shortened.
- Class and port names stay qualified when needed across features; the SQLite
  naming rule and the component/factory options conventions take precedence over
  shortening those names. The report lists each retained name explicitly.
- Final root validation passes in full. The owner's `.vscode/settings.json`
  change remains unstaged and is excluded from every part's commit.
