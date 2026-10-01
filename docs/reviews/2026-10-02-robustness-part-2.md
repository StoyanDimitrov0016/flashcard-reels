# Part 2 — typed expected failures

Branch: `fix/typed-expected-failures`.

Signals: fatal locked-rating paths 1 → 0; fatal ended-session rating paths 1 → 0;
unwrapped row parsers 3 → 0; missing shared message cases 7 → 0;
unvalidated route ID sites 3 → 0; silent corrupt-feed fallback sites 2 → 0.

The mounted Discover tests first failed for committed ratings and reset sessions.
Row-corruption tests first failed with raw Zod errors. They now retain table, row ID, and cause.
The rating result is typed; missing attempts in active sessions remain fatal. Session end requests
the existing learning-progress invalidation, once, and blocks further writes by the old controller.
Preference row failures retain the PREFERENCES_READ_FAILED fallback notice.

Validation: mobile check and full tests; db:check. Existing behavior assertions are retained;
two successful-rating assertions now compare the typed successful result, and feedback tests
no longer expect the explicitly removed recovery field.

## Plain Error audit

References below are the Part 1 commit (`a876350`), before this part. Context-provider guards
are excluded. Each site is listed; expected failures now use an AppError subclass.

| File and line | Class | Outcome / reason |
| --- | --- | --- |
| `features/decks/application/deck.service.impl.ts:56` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/decks/deck-installer/internal/deck-package-publication.ts:181` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/decks/deck-installer/internal/installed-audio-storage.ts:99` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction.ts:87` | Expected | `DECK_PACKAGE_ID_CONFLICT` |
| `features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction.ts:108` | Expected | `DECK_PACKAGE_ID_CONFLICT` |
| `features/decks/deck-installer/internal/sqlite-deck-package-installation.transaction.ts:233` | Expected | `DECK_PACKAGE_ID_CONFLICT` |
| `features/decks/infrastructure/expo-deck-package.downloader.ts:50` | Expected | `DECK_DOWNLOAD_FAILED` |
| `features/decks/infrastructure/expo-deck-package.picker.ts:20` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/decks/infrastructure/sqlite-saved-progress-continuation.transaction.ts:26` | Expected | `DECK_NOT_FOUND` |
| `features/decks/infrastructure/sqlite-saved-progress-continuation.transaction.ts:35` | Expected | `SAVED_PROGRESS_UNAVAILABLE` |
| `features/decks/infrastructure/sqlite-saved-progress-deletion.transaction.ts:27` | Expected | `SAVED_PROGRESS_UNAVAILABLE` |
| `features/flashcard-progress/domain/flashcard-progress.model.ts:33` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/flashcard-progress/domain/flashcard-progress.model.ts:40` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/flashcard-progress/infrastructure/sqlite-flashcard-progress-aggregation-transaction.ts:54` | Expected | `STUDY_SESSION_ENDED` |
| `features/flashcard-progress/infrastructure/sqlite-flashcard-progress-aggregation-transaction.ts:146` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/flashcard-progress/infrastructure/sqlite-flashcard-progress-aggregation-transaction.ts:203` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/flashcard-progress/infrastructure/sqlite-learning-progress-reset-transaction.ts:39` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/learning-engine/internal/ts-fsrs-scheduler.ts:78` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/progress-backup/application/progress-backup.service.impl.ts:149` | Expected | `PROGRESS_BACKUP_UNAVAILABLE` |
| `features/progress-backup/infrastructure/expo-progress-backup-file.gateway.ts:75` | Expected | `PROGRESS_BACKUP_UNAVAILABLE` |
| `features/progress-backup/infrastructure/expo-progress-backup-file.gateway.ts:89` | Expected | `FILE_SHARING_UNAVAILABLE` |
| `features/progress-backup/infrastructure/sqlite-progress-backup-restore.transaction.ts:57` | Expected | `PROGRESS_BACKUP_RESTORE_FAILED` |
| `features/reels/application/reel-feed.service.impl.ts:106` | Expected | `STUDY_SESSION_ENDED` |
| `features/reels/application/reel-feed.service.impl.ts:330` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/reels/application/reel-feed.service.impl.ts:334` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/study/application/study.service.impl.ts:95` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/study/application/study.service.impl.ts:203` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/study/application/study.service.impl.ts:291` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/study/application/study.service.impl.ts:375` | Expected | `STUDY_SESSION_ENDED` |
| `features/study/infrastructure/sqlite-review-attempt-commit-transaction.ts:75` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/study/infrastructure/sqlite-review-attempt-commit-transaction.ts:157` | Invariant | Internal consistency or programmer contract; stays plain. |
| `features/study/infrastructure/sqlite-review-attempt-transaction.ts:28` | Expected | `STUDY_SESSION_ENDED` |
| `features/study/infrastructure/sqlite-study-session-feed-transaction.ts:46` | Expected | `STUDY_SESSION_ENDED` |
| `features/study/infrastructure/sqlite-study-session-feed-transaction.ts:58` | Expected | `STUDY_SESSION_ENDED` |
| `infrastructure/bundled-deck-packages.ts:40` | Invariant | Internal consistency or programmer contract; stays plain. |
| `infrastructure/bundled-deck-packages.ts:43` | Invariant | Internal consistency or programmer contract; stays plain. |
| `infrastructure/bundled-deck-packages.ts:46` | Invariant | Internal consistency or programmer contract; stays plain. |
| `infrastructure/bundled-deck-packages.ts:67` | Expected | `BUNDLED_DECK_INSTALL_FAILED` |
| `shared/errors/normalize-error.ts:8` | Normalization helper, not a throw site | Constructs a fallback for an unknown value; classification belongs to its caller. |

Plain Error construction sites audited: 39 (38 throw sites plus the normalization helper).
Expected throw sites: 18 → 0 plain sites; invariant throw sites: 20 unchanged.

## Deviations

- `sqlite-study-session-lifecycle-transaction.ts:77` deliberately initializes feed state to `{}`.
  `parseFeedState` accepts that sentinel without reporting; malformed or invalid non-sentinel
  state is reported. This preserves the existing no-report assertion for normal deletion.
- `sqlite-progress-backup-restore.transaction.ts` keeps `PROGRESS_BACKUP_RESTORE_FAILED` for
  an ownership conflict, preserving its existing code and learner wording.
- The deck contract exports no lesson ID schema; the lesson route hook requires a non-empty string.
- The "No deck package was selected" branch follows a non-cancelled native selection with no asset;
  it is a native contract violation, not learner cancellation (which already returns null).
