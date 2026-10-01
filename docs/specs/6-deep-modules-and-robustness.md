# 6 - Deep modules and robustness

Status: ready for implementation. Code quality work in `apps/mobile`; the learner sees only the
changes listed under "Behavior changes".

## Problem and value

Phase 0 closes with a codebase that stays easy to change and an app that does not break in
daily use. An audit of `develop` found two kinds of problems:

- **Shallow modules.** Several services and hooks have interfaces about as large as what they
  hide. Callers must call them in a fixed order, and the same decision is written in several
  files, so one change touches many places.
- **Fragile failure paths.** Some expected situations become fatal errors, an expired QR code
  looks like a lost connection, and a few async writes can overwrite newer data.

## How to use this spec

Every fact below was checked against the code on `chore/deep-modules-and-robustness`. Line
numbers are approximate and shift as parts land; find code by the function or file named.

**Stop and report only when:**

1. doing an item as written would change behavior that its part does not list under "Behavior
   changes";
2. an item needs something the rules forbid (a schema SQL change, a new dependency, or a JSX
   restructure), and the item gives no fallback;
3. two items contradict each other;
4. you reach the planned stop at the end of Part 5.

**In every other case, continue.** Pick the option that keeps today's behavior, and add a
"Deviations" entry to the part's report with the file, line, and what you did. In particular:

- a line number, count, or name differs from the spec: use the code;
- the code has a condition the spec does not mention: keep the condition;
- a fix item describes a bug, and the test you write first shows no bug: skip that item;
- a listed site no longer exists: skip it.

## Definitions you can observe

Each definition says what to count or check, so a reviewer can tell whether a change helped.
"Deep" and "shallow" are the two ends of the same scale.

### Deep and shallow modules

A module is any unit with an interface: a service, repository, hook, component, or function. A
**deep module** gives callers a lot of behavior through a small interface. A **shallow module**
makes callers learn nearly as much as the module does.

| Signal               | How to observe it                                                                                               | Deep                                                      | Shallow                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| Pass-through members | Count members whose body is one call to another module with the same arguments, or the same plus `clock.now()`. | None, or one that marks a deliberate layer boundary.      | Most members.                                      |
| Caller sequences     | Search call sites for members that are always called together, in the same order.                               | One member per caller intent ("card became active").      | Callers run a protocol: A, then B, then C.         |
| Decision locality    | Search for one decision: a value list, formula, rule, file name, or format version.                             | Defined in one place; others import it.                   | Written in two or more places.                     |
| Caller knowledge     | Read a caller and list what it must know: order, preconditions, internal constants, which errors to expect.     | Only the intent and the typed outcomes.                   | Internal steps, guards, or constants.              |
| Mirrored interface   | Compare a hook's returned members with the props of the one component that uses it.                             | Fewer members than the component needs; the hook decides. | Every member relayed one to one.                   |
| Change amplification | Pick a likely change (add a rating value, change which sessions a deck affects) and count the files it touches. | One module plus its tests.                                | Several modules.                                   |
| Testability          | Read the module's tests.                                                                                        | Tested through its interface with real collaborators.     | Tests mock its single collaborator and restate it. |

Depth is not size. Do not merge unrelated responsibilities to make a module look deep. Split a
module into **sub-services** only when its members fall into groups with different callers and
no shared state; each group must then be deeper on its own. A new file or interface whose
implementation is shorter than its interface is a sign of "classitis" and needs a reason.

### Robustness

| Term                | Definition                                                                                                      | How to observe it                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Expected failure    | A failure the learner or the environment causes: bad file, expired QR code, no connection, a locked rating.     | It has an `AppErrorCode`, a test asserts the code, and the learner sees a message with a next step.             |
| Invariant violation | A failure that cannot happen when the code is correct.                                                          | A plain `Error` is fine. It reaches `reportError` and an error boundary.                                        |
| No impossible state | After an expected failure the screen is in a state normal use can reach.                                        | No endless spinner, no stuck busy flag, no error boundary. A test checks the state after each expected failure. |
| Retryable           | A transient failure (network, timeout) offers a retry that reruns the whole operation from the learner's input. | The retry needs no re-entry, such as re-scanning, and is safe to run again.                                     |
| Idempotent          | Running an operation twice with the same input leaves the same state as running it once.                        | An integration test runs it twice.                                                                              |
| Atomic              | A multi-step write is either fully applied or not applied, even when the app is killed between steps.           | One transaction, or a later run repairs the partial state. A test fails between steps.                          |
| Stale-result safe   | An older async result never overwrites a newer one.                                                             | A sequence or in-flight guard, plus a test that resolves out of order.                                          |

## Branches

Each part is one branch, started from the previous part's branch. This spec lives on
`chore/deep-modules-and-robustness`, which starts from `develop`.

| Part                                    | Branch                             | Starts from                         |
| --------------------------------------- | ---------------------------------- | ----------------------------------- |
| 1. One place for each decision          | `refactor/single-source-decisions` | `chore/deep-modules-and-robustness` |
| 2. Expected failures are typed          | `fix/typed-expected-failures`      | `refactor/single-source-decisions`  |
| 3. Deck import and network              | `fix/deck-import-robustness`       | `fix/typed-expected-failures`       |
| 4. Races and stale results              | `fix/async-races`                  | `fix/deck-import-robustness`        |
| 5. Study module design (document only)  | `docs/study-module-design`         | `fix/async-races`                   |
| 6. Deep study module                    | `refactor/deep-study-module`       | `docs/study-module-design`          |
| 7. Deck services that fit their callers | `refactor/use-case-services`       | `refactor/deep-study-module`        |
| 8. Names and dead members               | `chore/names-and-dead-members`     | `refactor/use-case-services`        |

## Rules for the whole task

1. **One part at a time, in order.** Create the part's branch, finish the part, run its checks,
   and make one commit with the message given. Do not push and do not merge.
2. **Only the stated behavior changes.** Everything else the learner can do or see stays the same.
3. **No schema change.** The migration SQL and the `0000` baseline must stay byte for byte the
   same, and `npm run db:check` must pass with no migration diff. `schema.ts` may change only
   to take value lists from the domain (Part 1, item 7).
4. **Tests protect behavior.** Each part adds tests for what it changes, through the real SQLite
   graph where persistence is involved (`tests/support/sqlite-study-scenario.ts`). Do not weaken
   or delete an assertion to make a part pass. When a test only calls a removed member, move it
   to the new interface and keep its assertions.
5. **Fix items are test first.** Write a failing test that shows the bug, then fix it. If the
   test passes before the fix, skip the item and report it.
6. **Presentation components are out of scope** except the smallest wiring a part needs, such as
   passing a new prop, calling a new hook, or showing an existing button component. Do not
   restyle or restructure JSX.
7. **Library behavior:** check Context7 or the installed package source before relying on it.
   Lint forbids `useMemo`; the React Compiler memoizes.
8. Leave `.vscode/settings.json` alone. Follow `AGENTS.md` and `docs/codebase-preferences.md`.
   Commands run from `apps/mobile`.
9. **Every part ends with** `npm run check` and `npm test` passing in `apps/mobile`, plus, from
   the repository root, `npm run check` and `npm run check:dead-code`. The root format check also
   covers new Markdown files, so format them before committing. The only expected root failure is
   the owner's local `.vscode/settings.json`. Its report gives:
   - the before and after counts of the signals it targets, for example "StudyService members:
     25 → 9";
   - the "Deviations" list.

## Part 1: one place for each decision

Each item is a decision written in more than one place. Give it one owner and import it
everywhere else. No behavior change.

1. **Which active sessions a deck change affects.** The rule is: every active Discover session,
   plus that deck's active Focus session when the deck is reinstalled, removed, or reset. A
   first install affects Discover only. Today it is written three times:
   - `StudyServiceImpl.settleActiveSessionsAffectedByDeck(deckId, includeFocused)` in
     `study.service.impl.ts` checks it in memory with two `findActiveByScope` calls;
     `deck-installer.ts` passes `includeFocused = installedRevision !== null`.
   - `sqlite-deck-package-installation.transaction.ts` (`affectedSessions`) writes it as SQL,
     with an `existingDeck` condition.
   - `sqlite-learning-progress-reset-transaction.ts` (`deleteActiveSessionsForDeck`) writes it
     as SQL, always including Focus.

   Make one SQL condition in the study infrastructure, for example
   `activeSessionsAffectedByDeck(deckId, { includeFocus })`, and use it in both transactions.
   Settlement then lists the sessions through a repository method built on the same condition.
   Keep the `includeFocus` meaning at every call site.

2. **First editable reel position.** `getFirstEditableReelPosition` lives in
   `reels/domain/editable-reel-position.ts`. `commitAttemptsOutsideEditableWindow` in
   `study.service.impl.ts` repeats its formula. Move the function into
   `study/domain/review-attempts.ts` next to `EDITABLE_REVIEW_ATTEMPT_WINDOW_SIZE`, use it in
   both places, and delete the reels file.
3. **Pending aggregation drain loop.** `study.service.impl.ts` has two copies of the same
   `while (true)` loop. One drains all pending sessions; the other, in `settleBeforeDeckRemoval`,
   drains one deck's. They differ only in the query they call. Make one private method that
   takes the query.
4. **Required session lookup.** `extendFeed`, `recordVisibleCard`, and `refreshFeed` in
   `reel-feed.service.impl.ts` each look up the session and throw "Missing study session". Make
   one private method.
5. **Leading reel position.** `Math.max(session.currentReelPosition, session.furthestReelPosition)`
   appears in `ensureMaterialized` and `buildPreparedFeed` in `reel-feed.service.impl.ts`. Make
   it one function; each caller keeps adding its own window size.
6. **Backup format name and version.** `"flashcard-reels-learner-data"` and version `1` appear in
   `progress-backup.schema.ts`, `sqlite-progress-backup.query.ts`, and
   `progress-backup.service.impl.ts`. Export them once from the contract.
7. **Value lists.** The domain declares these as TypeScript unions only. Add a `const` list next
   to each union, derive the union from it, and use the list where the values are repeated:
   - ratings: `learning-engine/domain/rating.ts`; repeated in `schema.ts` (both `rating`
     columns and their `CHECK`s), `progress-backup.schema.ts`, and `canonicalRatingOrder` in
     `reels/presentation/study-control-layout.ts`;
   - memory states: `learning-engine/domain/flashcard-memory-state.ts`; repeated in `schema.ts`
     and `progress-backup.schema.ts`;
   - preferences: `preferences/domain/app-preferences.ts` (`ColorMode`,
     `StudyIslandPosition`, `RatingDirection`, `ControlSide`); repeated in `schema.ts`
     (`learner_preferences` columns and `CHECK`s), `preferences/application/normalize-preferences.ts`,
     `positions` in `study-controls-sheet.tsx`, and the color modes in
     `preference-settings-components.tsx`.

   The `CHECK`s are hand-written SQL such as ``sql`${table.colorMode} IN ('light', 'dark', 'device')` ``.
   Build those value lists from the domain list with one helper, so the generated SQL is
   identical and `db:check` shows no diff. **Fallback:** if Drizzle's output changes, keep the
   literal `CHECK` SQL, and add one unit test that asserts each `CHECK` list equals its domain
   list.

8. **Deck cover keys.** `isDeckCoverAsset` in `infrastructure/bundled-deck-packages.ts` re-lists
   the keys. Use `DeckCoverAssetSchema` from `decks/contracts/deck.schema.ts`, which is built
   from `deckCoverAssetKeys`.
9. **Import file name.** `expo-deck-package.downloader.ts` builds `deck-import-<time>.fcrdeck`,
   and `infrastructure/app-recovery.ts` matches it with `DeckImportFileNamePattern`. Put the
   builder and the matcher in one module.
10. **Ratings that bring a card back.** `hasRecurrence` in `use-reel-controller.ts` hard-codes
    Again and Hard. The domain rule is `INTRA_SESSION_RECURRENCE_CONFIG` in
    `study/domain/recurrences.ts`. Export a function there, derived from that config, and use it
    in the controller.
11. **Open-session result.** `OpenStudySession` in `study/domain/study.service.ts` and
    `OpenStudySessionResult` in `study/application/study-session-lifecycle-transaction.ts` are
    the same type. Keep the domain one and import it in the application port.

Done when searching for each decision finds one definition, and rule 3 holds.

Commit: `refactor(mobile): give each shared decision one definition`.

## Part 2: expected failures are typed and recoverable

**Behavior changes:**

1. **Rating a card whose attempt is already committed.**
   - Today `StudyServiceImpl.rateAttempt` returns `false` when the attempt is committed or
     missing. `onRatingSelected` in `use-reel-controller.ts` turns `false` into a fatal
     `STUDY_PERSISTENCE_FAILED`, which reaches the error boundary. This can happen when a rating
     lands as the card leaves the editable window.
   - Return a typed outcome instead, for example
     `{ status: "rated" } | { status: "locked" } | { status: "missing" }`.
   - When it is locked, the feed keeps running, the card keeps showing its previous rating, and
     a toast says "This rating is already saved." (`showErrorToast` in
     `shared/presentation/flashcard-toast`).
   - A missing attempt stays fatal.
2. **A session ends while its feed is mounted.** Importing a new revision, removing, or resetting
   a deck completes or deletes active sessions (Part 1, item 1). Starting an attempt in such a
   session throws "Cannot create a review attempt for inactive session" in
   `sqlite-review-attempt-transaction.ts`.
   - Write the test first (rule 5): a mounted Discover feed, then a deck reset, then a rating.
   - If it reaches an error boundary, throw `STUDY_SESSION_ENDED` instead, and have the feed
     reload the way it does after `invalidateLearningProgress`.

**No other behavior changes:**

3. **Plain errors.** Domain, application, and infrastructure code throws plain
   `new Error(...)` in many places, for example in `study.service.impl.ts`,
   `reel-feed.service.impl.ts`, `sqlite-saved-progress-continuation.transaction.ts`, and
   `bundled-deck-packages.ts`. Context-provider guards ("must be used inside a provider") are
   not part of this item.
   - List every one and sort it into expected failure or invariant violation, using the
     definitions above.
   - Give each expected failure an `AppErrorCode` (`shared/errors/app-error-code.ts`) and throw an
     `AppError` subclass. Invariant violations stay plain.
   - The report includes the list.
4. **Row parsing.** Three repositories call `Schema.parse` on SQLite rows, so a `ZodError` can
   escape:
   - `sqlite-deck.repository.ts` (`DeckCoverAssetSchema.parse`);
   - `sqlite-study-session.repository.ts` (`StudySessionScopeSchema.parse`);
   - `sqlite-preferences.repository.ts` (`AppPreferencesSchema.parse`).

   Wrap those failures as `DATABASE_ROW_INVALID`, with the table and row id as context and the
   Zod error as the cause. `preferences-context.tsx` must keep falling back to defaults with its
   `PREFERENCES_READ_FAILED` notice.

5. **One exhaustive message map.** `getErrorFeedback` in
   `shared/presentation/errors/get-error-feedback.ts` switches on `AppErrorCode`.
   - It has no case for `DECK_PACKAGE_AUTHOR_CONFLICT` or the six `PROGRESS_BACKUP_*` codes.
   - Make the switch exhaustive, so a new code without a message fails typechecking.
   - Add messages for the missing codes. Reuse the wording in
     `decks/presentation/deck-import-feedback.ts` and `progress-backup-error-feedback.ts` where
     they already have one.
   - Handle `DeckParseError` from `@flashcard-reels/deck-contract` explicitly; it is not an
     `AppError`.
   - Remove the `recovery` field, which no caller reads.
6. **Report what is shown.** `usePausedDeckProgress` in
   `decks/presentation/controllers/use-paused-deck-progress.ts` shows its load and resolve
   errors without reporting the cause. Call `reportError` in both catches. `parseFeedState` in
   `reel-feed.service.impl.ts` silently replaces corrupt feed state; report it before replacing.
7. **Route parameters.** `deckId` comes unchecked from `useLocalSearchParams` in
   `deck-details-screen.tsx` and `deck-lessons-screen.tsx`, and `lessonId` in
   `lesson-screen.tsx`.
   - Parse `deckId` with `DeckIdSchema` (`decks/contracts/deck.schema.ts`), in one small hook
     both screens call.
   - For `lessonId`, use the deck contract's lesson id schema if it exports one; otherwise
     require a non-empty string.
   - An invalid value shows the not-found state each screen already has for a missing deck or
     lesson.

Tests cover items 1, 2, 4, 5 (the type check, plus one mapping per new code), and 7.

Commit: `fix(mobile): type expected failures and keep the feed running`.

## Part 3: deck import and network

**Facts:**

- The deck download is the app's only network call (`decks/infrastructure/expo-deck-package.downloader.ts`).
  It has a 60 s idle timeout, cancellation, and cleanup, but no retry.
- On Android, a non-2xx response rejects with `UnableToDownloadException("HTTP <code>")`
  (`node_modules/expo-file-system/android/src/main/java/expo/modules/filesystem/FileSystemDownloadTask.kt`,
  around line 200). Today every failure becomes `DECK_DOWNLOAD_FAILED`.
- The portal answers `GET /t/[token]` (`apps/web/src/app/t/[token]/route.ts`) with:
  - 410 when the token expired, 10 minutes after it was created (`apps/web/src/server/transfer/transfer-token.ts`);
  - 404 or 503;
  - otherwise a redirect to storage.

**Behavior changes:**

1. **HTTP status.** The downloader reads the status from the native error, using a unit test
   pinned to the exact message format, and maps it:
   - 404 or 410 → `DECK_DOWNLOAD_EXPIRED`: "This QR code has expired. Create a new one in the
     portal and scan it again."
   - 5xx → `DECK_DOWNLOAD_UNAVAILABLE`: "The deck server is unavailable. Try again in a moment."
   - Anything else stays `DECK_DOWNLOAD_FAILED`, worded "Couldn't download the deck. Check your
     connection and try again."

   Check the iOS source in the same package as well. If iOS reports status differently, handle
   both. If iOS gives no status, iOS keeps `DECK_DOWNLOAD_FAILED`; add a Deviations entry. Add no
   dependency.

2. **Retry without re-scanning.** Keep the last scanned URL. For `DECK_DOWNLOAD_FAILED`,
   `DECK_DOWNLOAD_TIMED_OUT`, and `DECK_DOWNLOAD_UNAVAILABLE`, the import sheet offers "Try
   again", which downloads the same URL. Expired links and invalid packages keep "Scan again".
3. **Leftover files.** `InstalledAudioStorage.stage` creates `deck-audio/.tmp-*` folders, and the
   downloader writes `deck-import-*.fcrdeck` to the cache. When the app is killed mid-import,
   only a full app reset removes them (`applyPendingAppDataReset` in
   `infrastructure/app-recovery.ts`). Remove both in `prepareAppStorage`, which runs once at
   start, before anything can download or stage.
4. **Bundled deck appearance.** `installBundledDecks` in `infrastructure/bundled-deck-installer.ts`
   installs a deck, then saves its theme and sets its cover as separate writes. If the app is
   killed in between, the next start skips the deck because its revision already matches, so the
   appearance is never applied. The `oxlint-disable` comment at the top claims one transaction.
   - On every start, for each installed bundled deck that was not dismissed, save the default
     theme when no theme selection exists, and set the cover when it differs.
   - Correct the comment.
   - Test: install, delete the theme row, start again, and the theme is back. A theme the learner
     chose stays.
5. **Delete and import of the same deck.**
   - `DeckInstallerImpl.withDeckGuard` queues installs per deck in a static map.
     `DeckServiceImpl.remove` runs outside that queue, and its audio removal can delete audio
     that an install just activated.
   - Move the per-deck queue into one module that both use. Test an interleaved delete and
     import.

Commit: `fix(mobile): explain failed downloads and retry them without re-scanning`.

## Part 4: races and stale results

1. **Feed state lost update.**
   - `materializeBatch` in `reel-feed.service.impl.ts` passes `persistedFeedState` to
     `appendSessionReels`, and `SQLiteStudySessionFeedTransaction.append` writes it back to
     `study_sessions.feed_state`.
   - `persistedFeedState` is the state read when materialization started, and it never changes
     during materialization. So the write only re-saves an old value, which can undo a
     `recordVisibleCard` write made in the meantime.
   - The same `UPDATE` is also the check that the session is still active.
   - Stop writing feed state in `append`, keep its active-session check, and drop the now-unused
     parameter.
   - Test: record a visible card while an extension is in flight. The recorded state survives.
2. **Stale feed replacement.** In `use-reel-controller.ts`, `refreshFeed` and
   `requestFeedExtension` both call `replaceFeed` when their load resolves. A slower, older load
   can replace a newer feed. Guard `replaceFeed` with one sequence, so only the latest started
   load applies. Test first (rule 5).
3. **Double taps.** These guard with React state, so two taps before a re-render both run:
   - `resolve` in `use-paused-deck-progress.ts` (`busy`);
   - the reset in `deck-details-screen.tsx` and in `settings-screen.tsx` (`resetting`).

   `use-delete-deck.ts` and `use-import-deck-package.ts` already use refs. Add one shared hook,
   for example `useSingleFlight(action)` returning `{ run, busy }`, that ignores a run while one
   is in flight. Use it in these places and replace the hand-written in-flight refs in the two
   hooks. Theme saves stay "last tap wins".

4. **Focus re-evaluation.** In `use-focused-feed-lifecycle.ts`, an app-foreground event during an
   evaluation returns early because `evaluationInFlight` is set, so it is dropped. Queue one
   trailing re-run instead.

Setting state after unmount is harmless in current React. Add unmount guards only where a stale
result would overwrite newer state, show a toast, or navigate on the wrong screen.

Commit: `fix(mobile): keep newer results when async work overlaps`.

## Part 5: study module design (document only)

**Audit findings.** Confirm or correct each in the document.

- `StudyService` (`study/domain/study.service.ts`) has about 25 members, plus the
  `StudySessionSettlement` members on the same class. `study.service.impl.ts` has about 630
  lines.
- These members look like pure pass-throughs to one repository or transaction:
  - `findSession`, `findSessionByScope`, `updateSessionFeedState`;
  - `listSessionReels`, `findMaxSessionBaseFeedPosition`, `findMaxSessionReelPosition`;
  - `listSessionReelsInReelPositionRange`, `listSessionRecurrences`;
  - `listPendingRecurrenceFlashcardIdsFromTargetPosition`, `listSessionRecurrencesInTargetRange`;
  - `listReviewAttemptsInReelPositionRange`.
- `updateSessionReelPosition` and `consumeRecurrence` only add the clock.
- No code outside the service calls `findSessionByScope`, `listSessionReels`, or
  `listSessionRecurrences`.
- Callers run protocols:
  - `ReelFeedService` calls `findMaxSessionReelPosition`, then
    `listSessionRecurrencesInTargetRange`, then `findMaxSessionBaseFeedPosition`, then
    `appendSessionReels`;
  - on each card activation, `use-reel-controller.ts` calls `updateSessionReelPosition`,
    `consumeRecurrence`, `recordVisibleCard`, `commitAttemptsOutsideEditableWindow`, then
    `compactSessionRuntimeData`;
  - each rating calls `startAttempt`, then `rateAttempt`.
- `useReelController` is about 310 lines and returns its own members plus everything
  `useRecallSession` returns, about 18 in total. Its only caller is `ReelFeed`.

Write `docs/reviews/YYYY-MM-DD-study-module-design.md`, at most 150 lines, covering:

- the caller intents (open a feed, card became active, rate a card, extend, refresh, settle
  before a deck change) and the one call each will use;
- the current and proposed interfaces as TypeScript signatures, including what
  `useReelController` returns (at most 8 members);
- whether `StudyServiceImpl` splits into sub-services, using the split rule above, and why;
- which module owns the session reel and recurrence queries the feed needs;
- the tests that protect today's behavior, and the risks.

Commit the document, then **stop and report**. Part 6 starts only after the owner approves it.

Commit: `docs(mobile): propose a deeper study module`.

## Part 6: deep study module

Implement the approved design. No behavior change.

Done when:

- each caller intent in the design is one call;
- the pass-through members, and members no one calls, are gone from public interfaces;
- `useReelController` returns what the design says;
- every study and reel integration test passes with its assertions unchanged.

Commit: `refactor(mobile): give the study feed one call per intent`.

## Part 7: deck services that fit their callers

**Facts:**

- `DeckService` (`decks/domain/deck.service.ts`) has 7 members. Every one except `remove` is a
  pass-through in `deck.service.impl.ts`.
- Callers combine it with `FlashcardService`:
  - `useDeckDetails` calls `findById`, `flashcardService.listByDeckId`, and `getThemeSelection`;
  - `useDeckCatalog` calls `list`, then `getThemeSelections` and
    `flashcardService.countFlashcardsByDeckIds`;
  - `ReelFeed` calls `useDeckCollection` and `useDeckThemeSelections` with the same deck ids.
- These 14 files repeat the same load pattern, a `let active = true` flag plus
  `{ loading, error, data }`:
  - `use-deck-catalog`, `use-deck-collection`, `use-deck-details`, `use-deck-theme-selections`;
  - `use-import-deck-sheet`, `use-flashcard-progress-list`, `use-flashcards`;
  - `deck-lessons-context`, `use-lesson`, `use-reading-lists`;
  - `preferences-context`, `use-progress-backup-controller`;
  - `use-prepared-reel-feed`, `use-recall-session`.
- `DeckServiceImpl` takes `sessionSettlement` as optional (default `null`), and `remove` throws at
  run time without it. Production always passes it (`create-deck-services.ts`). Some tests
  construct the service without it.
- No code calls `ReelFeedService.refreshOccurrences`; it only wraps `refreshFeed`.

**Changes, with no behavior change:**

1. **One query per caller need.** Add a query for each:
   - the deck page: deck, cards, and theme selection;
   - the catalog: decks with their theme and card count;
   - decks with their themes, by ids.

   They may live in `DeckService`, with the flashcard repository injected, or in a new
   deck-query service. Choose one and say why in the commit body. Remove members that then have
   no caller.

2. **One shared load hook.** Add a hook for the load pattern. It loads when its dependencies
   change, ignores stale results, and keeps today's "throw during render on error" where the
   current hook does it. Move the hooks that fit onto it. List any that do not, and why. Replace
   `useDeckCollection` and `useDeckThemeSelections` with one hook over the new query.
3. **Required settlement.** Make `sessionSettlement` a required constructor input of
   `DeckServiceImpl`, delete the run-time check, and pass a settlement in the tests that construct
   it.
4. **Dead member.** Remove `refreshOccurrences`. Keep
   `FlashcardProgressService.resetFlashcardProgress`, which is tested and planned for a per-card
   reset.

The thin `LessonService`, `PreferencesService`, `SavedProgressService`, and `FlashcardService`
stay as the presentation boundary (open question 3).

Commit: `refactor(mobile): give deck services one query per screen need`.

## Part 8: names and dead members

1. **Transaction file names.** Some end in `.transaction.ts`, for example
   `sqlite-deck-removal.transaction.ts`. Others end in `-transaction.ts`, for example
   `sqlite-review-attempt-transaction.ts`, and their ports do the same. Rename every
   `-transaction.ts` file to `.transaction.ts`, following codebase preference 10.
2. **Alias.** Replace imports of `preferences/presentation/hooks/use-preferences.ts`, a one-line
   alias, with the real hook, and delete the alias.
3. **Long names.** List identifiers longer than 35 characters that remain after Parts 5–7.
   Shorten only a name that repeats what its module or type already says. For example, a method
   of `StudySessionRecurrenceRepository` does not need "Recurrence" in its name. Keep the
   `SQLite<Port>` class pattern. The report lists every name kept or changed.

Commit: `chore(mobile): align transaction file names and remove aliases`.

## Final verification

On `chore/names-and-dead-members`:

- from the repository root, `npm run check`, `npm test`, and `npm run check:dead-code` pass;
- in `apps/mobile`, `npm run db:check` (no migration diff) and `npm run decks:check` pass.

Report each branch with its commit, its before/after signal counts, and its Deviations, plus
anything not done and why.

## Out of scope

- Presentation components, screens, and styles beyond rule 6. The owner and Claude deepen the
  Decks screen sections (paused progress and import), where `usePausedDeckProgress` and
  `useImportDeckPackage` relay their members one to one.
- Screen controllers used by exactly one screen, such as `useArchivedProgress` and
  `useProgressBackupController`. One controller per screen is the established pattern.
- One-member transaction and repository ports. Each is one unit of work.
- Schema changes, new dependencies, `apps/web`, and `packages/deck-contract` beyond imports.
- Lesson progress, lesson audio, computed progress, and skip events.

## Open questions

These do not block any part.

1. **A bundled deck that fails to install blocks app start** (`initializeDatabase` in
   `infrastructure/sqlite/database.ts`). Recommendation: start anyway, report the failure, and
   retry on the next start. Unchanged until the owner decides.
2. **A locked rating** shows the previous rating with a toast (Part 2, item 1). This is the
   chosen default.
3. **Thin services.** Keep the pass-through services as the only boundary between presentation
   and infrastructure (current choice), or expose their ports through the dependency hooks and
   delete them.

## Acceptance

Each part's checks pass on its own branch, in order, with one commit per part. Part 5 is
approved before Part 6 starts, and the final verification passes.

## Time budget

Five evenings. Part 6 is the largest. If it does not fit, land Parts 1–5 and cut Parts 7–8.
