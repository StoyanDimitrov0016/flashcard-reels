# Mobile error handling and recovery specification

Status: original implementation handoff, followed by an implemented refinement round. Original audit line references below are historical, not current source locations.
Audited: 2026-09-16. Target implementer: GPT 5.6 Luna, High reasoning.
Scope: `apps/mobile`; root lint configuration only where needed. The internal Next.js portal is out of scope.

## 1. Decisions already made

Implement the decisions below rather than redesigning the error architecture. Preserve the current worktree's uncommitted recovery changes. Line references below describe this snapshot and will move during implementation; use the named symbols as the durable reference.

- Use standard thrown `Error` instances and rejected promises. Add a small typed application error contract; do not migrate service signatures to `Result` in this pass.
- The base `AppError` accepts one object with `name`, `code`, `message`, optional `cause`, and optional diagnostic `context`. The base assigns the name; subclasses pass literal names through `super`. Do not override/redeclare `name` in each subclass and do not derive it from `this.constructor.name`.
- Define errors where their meaning is known. Feature-specific errors stay with their owning feature; shared code contains the contract and common operation errors, not imports of every feature.
- Keep classification, friendly feedback, technical formatting, and reporting separate. There is no universal message-string parser.
- Error ownership follows UI scope: app/root, layout/section, screen/view, and local operation/component. A screen failure must normally leave the tab bar mounted.
- A global fallback is a component and a boundary scope, not a singleton error store or an `ErrorProvider` that all failures publish into.
- Destructive recovery is a separately confirmed escape hatch. It is never automatic and never implied to fix every error.
- Fix critical async handling as part of this work. New classes alone do not repair swallowed failures or rejected event-handler promises.
- Do not add an observability SDK, a boundary library, a broad error-class hierarchy, background write retries, or native global exception hooks.

Reasoning: the existing architecture already has useful feature errors and asynchronous load-to-render bridges. The smallest useful evolution preserves those patterns, makes failures identifiable, and assigns recovery to the part of the UI that owns the operation. A universal result migration would add caller work without catching render/native/library exceptions.

## 2. Verified SDK 57 behavior and sources

Installed versions inspected: Expo `57.0.22`, Expo Router `57.0.21`, Expo SQLite `57.0.3`, React `19.2.3`, React Native `0.86.3`. Confirm against `apps/mobile/package.json` and installed package metadata if dependencies change.

Context7 was used first. Its Expo results offered version-specific branches only through SDK 56, so those must not be represented as SDK 57 documentation. SDK 57 behavior was cross-checked against official live documentation and the installed SDK 57 source.

Expo Router supports exported route/layout boundaries and SDK 57 screen-boundary configuration that preserves navigator chrome. It also supports inherited layout Suspense fallbacks. Sources: [Expo error handling](https://docs.expo.dev/router/error-handling/), [SDK 57 Router reference](https://docs.expo.dev/versions/v57.0.0/sdk/router/).

Installed implementation evidence:

| Source                                                                | Verified behavior                                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node_modules/expo-router/build/useScreens.js:141–182`                | An exported `ErrorBoundary` wraps the default layout/screen component. Providers inside that component are not ancestors of its fallback.                           |
| `node_modules/expo-router/build/useScreens.js:236–277`                | Inherited `ScreenErrorBoundaryContext` wraps non-layout screen content inside the route.                                                                            |
| `node_modules/expo-router/build/layouts/withLayoutContext.js:117–129` | Navigator `unstable_screenErrorBoundary` supplies that context.                                                                                                     |
| `node_modules/expo-router/build/views/Try.js`                         | `retry()` clears the caught error; it does not reset SQLite, clear data, or restart the native process.                                                             |
| `node_modules/expo-router/build/ExpoRoot.js:79`                       | Router owns an outer `SafeAreaProvider`; fallback code still must not depend on app-owned providers.                                                                |
| `node_modules/expo-sqlite/src/hooks.tsx:190–242`                      | Non-Suspense SQLite setup stores async failures and throws during render by default. `onError` is invoked during render. Do not set React state from that callback. |
| `node_modules/expo-sqlite/src/hooks.tsx:293`                          | `onInit` must resolve before the connection is assigned to the provider ref. A rejected initializer requires the existing explicit connection cleanup.              |

React boundaries do not catch ordinary rejected async callbacks, event handlers, their own fallback failures, or server rendering failures. Catch async operations at their owner and either retain local feedback or store an error and throw it on the next render. Source: [React error boundary documentation](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary).

Do not generalize the root fallback into a handler for native crashes, JS bundle/module evaluation failures before a boundary mounts, or native-module loading failures. These remain diagnostic/device/build concerns.

## 3. Current audit and required corrections

| Current location                                                                                                                                           | Finding                                                                                                                                                             | Required outcome                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/_layout.tsx:26`, `RootLayout:91`                                                                                                                  | Correct root export and storage preparation gate; fallback now avoids preferences. Root callback currently accepts SQLite failures without stable classification.   | Preserve root boundary and provider independence; classify database setup/provider failures without losing causes. Root fallback has retry and app recovery, never Home. |
| `src/app/(tabs)/_layout.tsx:15`                                                                                                                            | The exported boundary wraps `TabLayout`, so an unhandled child screen error can remove `TopTabs` and its providers.                                                 | Keep this boundary for layout/provider failures; add an inherited screen boundary for leaf views.                                                                        |
| `src/app/decks/[deckId].tsx:6`                                                                                                                             | Correct screen-level export, currently generic presentation.                                                                                                        | Use the new view fallback; retain the route-specific deck title and Home navigation.                                                                                     |
| `src/app/(tabs)/(discover)/_layout.tsx:3`                                                                                                                  | Existing `unstable_settings` has `initialRouteName: "index"`.                                                                                                       | Preserve this setting; let screen-boundary context inherit rather than replacing settings wholesale.                                                                     |
| `src/shared/presentation/components/error-state.tsx:23`                                                                                                    | One full-screen component owns formatting, console reporting, navigation actions and full reset. Every caller receives reset, regardless of scope.                  | Split presentation scopes, diagnostics and reporting. Reset must be explicitly opted into by root/section recovery.                                                      |
| `src/features/flashcards/presentation/hooks/use-flashcards.ts:36–60`; deck load hooks; `use-learner-progress.ts:69–89`; `use-prepared-reel-feed.ts:76–101` | Async failures are already stored and thrown during render, which is appropriate for essential view loads. Non-Error rejection branches discard the original value. | Preserve bridge and cancellation guards; retain non-Error causes. Let screen boundaries own retry/remount.                                                               |
| `src/features/reels/presentation/hooks/use-focused-feed-lifecycle.ts:19–35`                                                                                | `evaluate()` has `finally` but no catch; both initial and AppState calls discard its promise.                                                                       | Handle resume errors explicitly and end the restoring state. See section 7.                                                                                              |
| `src/features/reels/presentation/context/feed-scope-context.tsx:33–106`                                                                                    | Focus restoration is owned by a tabs-level provider; without a lifecycle event, `focusRestoring` can remain true.                                                   | Model restoration failure separately from empty focus; preserve unrelated tabs.                                                                                          |
| `src/features/reels/presentation/hooks/use-reel-controller.ts:195,220,229`                                                                                 | Activation, recurrence refresh and rating failures are swallowed. Queue cleanup catches are mixed with failure ownership.                                           | Fail essential persistence safely and visibly; retain serialization and cleanup.                                                                                         |
| `src/features/reels/presentation/hooks/use-reel-controller.ts:128–129`                                                                                     | `Promise.allSettled` waits for ratings but ignores their outcomes before activation/finalization continues.                                                         | Observe rejection outcomes and a retained critical-failure flag; do not finalize after a known rating failure.                                                           |
| `src/features/reels/presentation/hooks/use-recall-session.ts:92`                                                                                           | Review-attempt loading silently fails, losing authoritative attempt/rating information.                                                                             | Escalate essential hydration failure to the screen boundary.                                                                                                             |
| `src/features/reels/presentation/components/reel-feed.tsx:155–157`                                                                                         | End-of-feed extension rejection is ignored.                                                                                                                         | Show local extension feedback and allow an explicit retry without clearing the existing feed.                                                                            |
| `src/features/audio/presentation/hooks/use-answer-audio.ts:15,21–34`; `components/answer-audio-player.tsx:41`                                              | Seek/toggle promises can reject without an owning catch. Native player status errors already disable the control.                                                   | Keep audio failures local and observable; text and ratings remain usable.                                                                                                |
| `src/features/preferences/presentation/screens/you-screen.tsx:43`                                                                                          | Controls uses `useLearnerProgress` only for its progress-reset action; the hook loads progress and can throw, hiding Controls and full recovery.                    | Decouple the reset action from progress reads.                                                                                                                           |
| `src/features/preferences/presentation/preferences-context.tsx:58–85`                                                                                      | Storage failures are currently full technical strings in context; defaults remain usable.                                                                           | Store normalized errors, map friendly copy in UI, expose details separately. Preserve usable defaults and write serialization.                                           |
| `src/features/decks/deck-installer/index.ts:9–21`                                                                                                          | Two useful custom errors already exist and consumers use `instanceof`.                                                                                              | Extend `AppError` while preserving class identities and public exports.                                                                                                  |
| `src/features/decks/deck-installer/internal/archive-deck-package.reader.ts:149,206`                                                                        | Wrapping ZIP/JSON failures embeds only a message.                                                                                                                   | Preserve original exception as `cause` when wrapping.                                                                                                                    |
| `src/features/decks/presentation/hooks/use-save-deck-appearance.ts:24` and progress-reset catches in screens                                               | Friendly copy replaces the exception entirely.                                                                                                                      | Keep causes for reporting/optional details; retain local sheets and current caller return contracts.                                                                     |
| `src/infrastructure/app-recovery.ts:7–15`                                                                                                                  | Session guard defers new reset requests across root retries.                                                                                                        | Preserve it; a React retry is not a cold launch.                                                                                                                         |

All app paths in the audit table are relative to `apps/mobile/`. Existing source changes are the baseline, not changes to discard.

## 4. Error contract and ownership

Create:

```text
apps/mobile/src/shared/errors/app-error.ts
apps/mobile/src/shared/errors/app-error-code.ts
apps/mobile/src/shared/errors/operation-error.ts
apps/mobile/src/shared/errors/normalize-error.ts
apps/mobile/src/infrastructure/errors/startup-error.ts
apps/mobile/src/infrastructure/errors/recovery-error.ts
```

These modules must be framework-neutral except infrastructure wrappers may be used by platform adapters. No React, Router, SQLite, Drizzle or filesystem imports in `shared/errors`.

Use the following base shape. Explicit fields are intentional: mobile `tsconfig.json` enables `erasableSyntaxOnly`, so constructor parameter properties such as `constructor(readonly code: ...)` are inappropriate here.

```ts
import type { AppErrorCode } from "./app-error-code";

export type ErrorContext = Readonly<Record<string, string | number | boolean | null>>;

export type AppErrorParams = Readonly<{
  name: string;
  code: AppErrorCode;
  message: string;
  cause?: unknown;
  context?: ErrorContext;
}>;

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly context: ErrorContext | undefined;

  constructor({ name, code, message, cause, context }: AppErrorParams) {
    super(message, { cause });
    this.name = name;
    this.code = code;
    this.context = context;
  }
}
```

`AppErrorCode` is a string-literal union in the shared registry. This registry contains stable codes only; feature messages/classes and UI mappings remain owned elsewhere. Do not add duplicate category, severity, retryable, HTTP status, or recovery fields to the exception contract.

First-pass code registry and meaning:

| Code                            | Meaning / construction owner                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_UNAVAILABLE`          | Unclassified failure from SQLiteProvider; can include open/provider/close issues, so do not label it specifically a migration or corruption failure. |
| `DATABASE_CONFIGURATION_FAILED` | Connection PRAGMA/configuration failed in `initializeDatabase`.                                                                                      |
| `DATABASE_MIGRATION_FAILED`     | Migration phase rejected.                                                                                                                            |
| `BUNDLED_DECK_INSTALL_FAILED`   | Startup bundled installation rejected, irrespective of underlying validation/storage cause.                                                          |
| `APP_RESET_APPLY_FAILED`        | Pending reset could not fully apply before startup.                                                                                                  |
| `APP_RESET_REQUEST_FAILED`      | Reset marker could not be persisted.                                                                                                                 |
| `APP_RESET_UNSUPPORTED`         | Unsupported programmatic full reset, currently web.                                                                                                  |
| `DECK_PACKAGE_INVALID`          | Existing package validation class.                                                                                                                   |
| `DECK_PACKAGE_VERSION_CONFLICT` | Existing version class; keep its current semantics.                                                                                                  |
| `DECK_NOT_FOUND`                | Requested deck does not exist; do not treat this as corrupt database evidence.                                                                       |
| `VIEW_LOAD_FAILED`              | A required view read/hydration failed; context identifies operation.                                                                                 |
| `FOCUS_RESTORE_FAILED`          | Resume/evaluation of focused-session state failed.                                                                                                   |
| `STUDY_PERSISTENCE_FAILED`      | Essential attempt/rating/position operation failed.                                                                                                  |
| `FEED_EXTENSION_FAILED`         | Additional feed window could not load, while existing feed remains usable.                                                                           |
| `PREFERENCES_READ_FAILED`       | Preferences could not load; defaults are usable.                                                                                                     |
| `PREFERENCES_WRITE_FAILED`      | Preferences could not persist.                                                                                                                       |
| `DECK_OPERATION_FAILED`         | Delete/palette mutation failed; context identifies which operation.                                                                                  |
| `PROGRESS_RESET_FAILED`         | Explicit learning-progress reset rejected.                                                                                                           |
| `AUDIO_PLAYBACK_FAILED`         | Owned seek/playback operation failed.                                                                                                                |

Use one `OperationError` for common UI-owned operation wrapping rather than a class for every code. It accepts object parameters excluding `name`, and passes literal `"OperationError"` to the base. `StartupError` and `RecoveryError` follow the same convention, constrain their code sets, and preserve causes/context.

Existing deck error constructors remain simple:

```ts
export class DeckPackageValidationError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super({
      name: "DeckPackageValidationError",
      code: "DECK_PACKAGE_INVALID",
      message,
      cause: options?.cause,
    });
  }
}
```

`normalize-error.ts` exports two distinct helpers:

- `toError(value: unknown, fallbackMessage: string): Error`: return an existing Error unchanged; otherwise create an Error with the original value as `cause`.
- `toOperationError(value: unknown, params: { code; message; context? }): AppError`: preserve an existing AppError unchanged; otherwise wrap in OperationError with `cause: value`.

The latter is for catch sites where the operation owns the meaning. Startup and reset phase wrappers are an exception to preservation: deliberately wrap even an AppError when adding the outer startup/reset classification. A bad bundled package during startup is a startup failure, not an instruction for the user to choose another import file.

Do not indiscriminately migrate provider-required errors, impossible domain states, counter invariants, or every `throw new Error`. These are programmer/invariant failures and remain thrown. Add custom codes later only when a consumer requires specific behavior. User cancellation remains the existing `null` outcome; successful deck imports retain `installed | updated | no-op`.

## 5. Oxlint compatibility: settled by experiment

The installed Oxlint was tested with the agreed base/subclass design and explicit `-D unicorn/custom-error-definition`. It reports:

```text
base assignment: The `name` property should be set to `AppError`.
derived class: The `name` property should be set to `DeckPackageValidationError`.
```

The temporary probe was removed. This rule analyzes class syntax rather than our parent-constructor contract. It cannot validate dynamic base names or delegated subclass names. Documentation: [custom-error-definition](https://oxc.rs/docs/guide/usage/linter/rules/unicorn/custom-error-definition).

Refined policy: disable `unicorn/custom-error-definition` explicitly in root `.oxlintrc.json`, retain the object constructor, and remove its repetitive suppression comments. The rule cannot check our delegated contract, so runtime contract tests enforce names, inheritance, codes and causes. Do not weaken unrelated lint settings.

Compensate with runtime tests asserting literal names, codes, `instanceof Error`, `instanceof AppError`, subtype identity, and cause preservation for every introduced subclass. This is an explicit design exception, not an unresolved question for Luna.

## 6. UI hierarchy and boundary wiring

Create:

```text
apps/mobile/src/shared/presentation/errors/get-error-feedback.ts
apps/mobile/src/shared/presentation/errors/report-error.ts
apps/mobile/src/shared/presentation/components/error-details.tsx
apps/mobile/src/shared/presentation/components/global-error-state.tsx
apps/mobile/src/shared/presentation/components/view-error-state.tsx
apps/mobile/src/shared/presentation/components/view-error-boundary.tsx
```

Refactor existing `error-state.tsx` into a presentational primitive. It takes title, message, actions, optional colors, and children; it does not import app-reset actions, log exceptions, classify errors, or navigate. Prefer typed action objects over separate optional labels/handlers, preventing an unlabeled button. Its default palette uses `useColorScheme()` plus semantic tokens; optional colors allow normal views to match app preferences. It must work without `PreferencesProvider`.

Hierarchy:

```text
Expo Router root exported ErrorBoundary
  GlobalErrorState: app failure, diagnostics, retry, confirmed full recovery
  RootLayout providers + Stack (inherited screen boundary)
    tabs exported ErrorBoundary: tabs layout/provider failure
      ViewErrorState(scope="section", allowAppRecovery=true)
      tabs inherited screen boundary
        TopTabs remains mounted
        individual leaf screen failure -> ViewErrorState(scope="screen")
          local mutation/player failure -> its component/sheet's own feedback
    deck-details exported ErrorBoundary -> ViewErrorState(scope="screen")
```

This is a containment hierarchy, not multiple global state machines. Error data belongs to the operation/hook; nearest boundary owns render recovery.

### Root and layout boundaries

- Root exported `ErrorBoundary` renders GlobalErrorState with `error` and `retry`. No router, services, preferences, theme hook, or navigation-dependent button.
- Keep tabs exported `ErrorBoundary` to handle failures in `DeckAppearanceProvider`, `FeedScopeProvider`, or the navigator itself. Its section fallback may offer app recovery because Controls is inside the failed section. Its Home action must not simply navigate back into the same failed tabs layout; section recovery uses retry or full recovery, without a misleading Home button.
- Configure `unstable_settings.screenErrorBoundary` on root and tabs layouts to inherit a provider-independent screen handler. Preserve all existing settings in nested layouts. This static SDK 57 configuration is preferred to a custom boundary around each route. Preserve the deck-details screen's specific exported handler, which takes precedence.

Example in each composition/layout file:

```ts
import { ViewErrorBoundary } from "@/shared/presentation/components/view-error-boundary";

export const unstable_settings = {
  screenErrorBoundary: ViewErrorBoundary,
};
```

`ViewErrorBoundary` accepts Expo `ErrorBoundaryProps`, renders ViewErrorState, supplies Router retry and a safe Home route `/(tabs)/(discover)`, and reports once per caught error. Home can be omitted for failure on the Home route itself. Root and section fallbacks must not depend on this wrapper.

Acceptance requires a device or Router-level test that the SDK 57 setting works with existing `TopTabs` from `expo-router/js-top-tabs`, not just Stack. Installed route wrapping supports inheritance independent of navigator type, but rendering behavior still requires validation. If installed types/runtime reject the setting, use explicit leaf route ErrorBoundary exports as a documented fallback, preserving tab containment; do not rebuild the navigator.

### GlobalErrorState / ViewErrorState / local feedback

- GlobalErrorState: full safe-area screen with friendly copy, retry, expandable diagnostics and the existing AppResetAction. Never requires app providers or persists diagnostics to SQLite.
- ViewErrorState: replaces just route content, retains navigator chrome, offers retry and optional Home, and expandable diagnostics. No full reset by default. A section variant allows AppResetAction explicitly.
- Local feedback: palette/import/delete/reset sheets retain their current custom layout. Audio gets its own unavailable/error state. Do not use a full-screen error component inside every card or add a universal local boundary framework in the first pass.
- Optional independent-widget render boundaries are deferred. Most identified local failures are async and require catches, not component boundary classes. A render failure in the player can initially reach the view boundary; isolating that render subtree is a later enhancement.

### Loading

Keep root exported SuspenseFallback provider-independent. Split actual startup loading/recovery from inherited route-loading presentation: create `startup-loading-state.tsx` containing AppResetAction, while Router SuspenseFallback is a plain route-loading indicator with no destructive recovery button. Current RootLayout manually uses SuspenseFallback for initialization, so replace those manual uses with StartupLoadingState. Root preference loading must also keep recovery reachable while `ready` is false.

SuspenseFallback handles suspended route rendering; effect-based database/preferences work does not automatically suspend. Preserve explicit preparation/database-ready gates, stable onInit identity, and existing SQLite non-Suspense mode. Do not turn on `useSuspense` just to make loading/error architecture look uniform.

### Friendly mapping versus diagnostics

`get-error-feedback.ts` exports a pure shared mapper:

```ts
type ErrorFeedback = Readonly<{
  message: string;
  recovery: "retry" | "choose-file" | "app-recovery" | "none";
}>;
```

Inspect only an actual AppError's outer code. Never infer corruption, unsupported hardware, storage exhaustion or transient networking from message substrings. Do not recursively replace outer classification with the deepest cause. Unknown errors get neutral contextual copy; never display a raw technical message as primary copy. The wrapper decides which suggested actions are actually possible. `app-recovery` means offer confirmed/manual recovery, not reset automatically or hide retry.

Keep `features/decks/presentation/deck-import-feedback.ts` as the feature mapper and preserve its public return shape. It can inspect its existing classes/codes and delegate unknown errors to safe fallback copy. Shared mapping must not import feature classes.

Extend `shared/application/error-details.ts` rather than replacing it with a parser. Include explicit AppError name/code/context even if stack exists; append bounded causal chains. Retain cycle handling and add depth/output limits (for example, 8 causes and 16 KiB). Unknown object serialization must be defensive. App-defined context contains only owned IDs/stages/operation names, never signed download URLs, deck/card content, SQL parameters or credentials. Native exception messages can still contain incidental details; diagnostics are local and user-requested, with no automatic external upload.

ErrorDetails renders expandable, selectable diagnostic text including app version, platform/version and describeError output. ReportError is the single local device-log adapter; use an explicitly justified no-console exemption there. It must tolerate formatter failures. Fatal errors are logged by boundary ownership; local errors by operation ownership. Do not log the same incident at every catch/rethrow layer. No persistent error queue or backend is needed.

## 7. Async ownership and exact behavioral requirements

### Essential view reads

Update catches in `use-flashcards`, `use-decks`, `use-deck-appearances`, `use-deck-catalog`, `use-deck-details`, `use-learner-progress`, and `use-prepared-reel-feed` to retain causes and meaningful load codes/context. Existing render throws and active/disposed guards stay. A requested missing deck becomes DECK_NOT_FOUND; a missing appearance during feed assembly stays a view-load/invariant failure rather than falsely claiming that reset is required.

Store errors in state in async catch handlers. Do not `throw` from an unawaited catch callback and expect Router to catch it. On boundary retry the failed view remounts and loads again. Do not add automatic loops or reuse a rejected preparation promise as an explicit retry mechanism.

### Focus restoration: local to Focus, not all tabs

Change `useFocusedFeedLifecycle` to accept explicit success and failure callbacks (or one typed outcome callback); catch both initial and AppState evaluation failures and preserve the in-flight/disposed guarantees. FeedScopeProvider models `restorationError: Error | null`, a settled restoring flag, and an explicit retry function. Store failure; do not throw from FeedScopeProvider since it would remove every tab.

FocusedFeedScreen renders local full-view restoration feedback with Retry and Choose a deck when restoration failed and no usable focused feed exists. If a usable feed already exists when a later resume evaluation fails, preserve it and show a local notice. Success clears restoration error. Failure must not be indistinguishable from an empty successfully restored focus. User explicit deck selection may proceed without waiting for failed restoration; do not mutate/delete persisted sessions as error handling.

### Study writes and feed windows

In `use-reel-controller.ts`, introduce an owned fatal Error state plus a synchronous ref retaining the first critical persistence failure. Essential startAttempt, rating persistence, current-position/activation persistence and required attempt hydration failures must stop scheduling further study writes and reach the view boundary through a render throw. Guard handlers against the ref before enqueueing more work. Already started operations cannot be assumed rolled back.

Queue tails may resolve after failure to prevent unhandled rejection, but their catch must record the owned failure. Cleanup-only branches may consume a derived promise only after another branch clearly owns error handling. Do not replace every catch mechanically: `startAttempt` returns a rejecting promise to its caller, whereas rating handlers have no external promise owner.

Retain pending-rating tracking until each owned outcome has been observed. `awaitPendingRatings` must inspect all settled outcomes and the retained critical flag before activation proceeds to finalize/compact. A failure removed from the pending set must still be remembered. Test a rejection that settles before the activation snapshots the set. Preserve the ordering in `reels/application/reel-position-extension.ts` and existing ordering tests; do not change FSRS, recurrence or session transaction semantics.

No automatic replay of writes. Route retry remounts/rehydrates from persisted state and is distinct from repeating the failed command. Do not claim a failed multi-step activation left progress unchanged.

Treat load-only feed extension failure as local FEED_EXTENSION_FAILED feedback: keep the current feed, show an explicit retry at the feed end, clear notice on success. Preserve `extensionInFlight` deduplication and finally cleanup. Activation may call extension after essential persistence; distinguish this optional window-loading failure from the already successful write steps so it does not automatically become STUDY_PERSISTENCE_FAILED. Recurrence refresh failure is also a local view-refresh notice after a committed rating, rather than claiming that rating failed. Prevent next-window navigation when data is unavailable.

### Preferences and Controls

PreferencesProvider retains defaults on read failure and updates local preference values as currently designed. Store Error rather than a formatted diagnostic string, preserving the serial write queue. After a write failure show friendly copy that settings may not survive closing; do not promise durability. Successful latest write clears its warning. Do not add auto retries or report internal errors as normal setting values.

Create `features/learner-profile/presentation/hooks/use-reset-all-progress.ts`. It calls `learnerProfileService.resetAllProgress` and invalidates learning-progress revision, without reading profiles/cards/decks. Use this hook in YouScreen instead of `useLearnerProgress`; remove its refresh dependency. Existing Progress screen uses the revision to refresh. This preserves a usable Controls/recovery screen when progress reads fail.

Reset failures remain inside existing ResetProgressSheet and retain causes. Preserve current public service/hook contracts. Only state that progress was unchanged where the operation's transaction guarantees it; otherwise say the reset could not finish, log details and invite retry. Do not infer rollback from receiving a rejection.

### Local mutations, cancellation and cleanup

Import/delete/palette hooks retain current busy flags and `null`/boolean caller contracts. Wrap unknown failures appropriately, retain feature error identity, and display local mapped copy. Cancellation is not a reportable failure. Palette/reset catch sites that currently discard causes must retain/report them even if their public UI property remains a string for compatibility.

Audio hook handles both synchronous native-method exceptions and rejected seeks. Toggle returns a handled promise or the component explicitly catches it; inactive-source `seekTo(0)` also has an owner. Present native `status.error` and owned playback errors through a small visible/audio-accessible unavailable state. Missing source is normal, not an error. Do not crash study or offer data reset for optional playback failure.

Cleanup can remain best effort, e.g. temporary import-file deletion after successful installation. Preserve primary result/failure and report cleanup separately if useful; never replace a successfully committed result with the cleanup exception. Cosmetic SystemUI failures may remain best effort with an explanatory comment. Critical reads/writes must not use unexplained empty catches.

## 8. Startup and destructive recovery constraints

`initializeDatabase` tracks a typed startup stage and produces matching StartupError codes with native cause. Keep explicit `closeAsync()` on initializer failure because installed SQLiteProvider has not yet retained that connection. If close itself fails, preserve the original startup exception; report cleanup separately without masking it.

If supplying SQLiteProvider `onError`, use a stable module-level pure handler that throws: preserve existing StartupError/AppError; wrap otherwise as DATABASE_UNAVAILABLE. Do not call `setState`, reset files, or navigate from this render-time callback. Keep root recovery independent of SQLite availability.

`prepareAppStorage` must run before any main or preference database opens. Classify pending reset application failures as RecoveryError and preserve the marker for safe continuation next cold launch. Preserve exact owned targets: main DB and sidecars, `ExpoSQLiteStorage` and sidecars, document `deck-audio`, and named deck-import cache artifacts. Never recursively delete the entire documents/cache directory.

Maintain the module/session guard. A reset request made during the current session is deferred even if a root error boundary retries. No reload API is added: JS reload is not proof that native connections/process state have been released. Android UI explains Force stop in Settings, then reopen; iOS explains removing from recent apps. Web shows manual site-storage guidance and does not access native filesystem paths.

Reset marker request failure is local to AppResetAction and gets friendly instructions plus optional original diagnostics. Distinguish scheduling from completion. UI must never show “data reset” immediately after writing the marker. Bundled decks are restored through normal startup, and their own reinstall failure remains reportable.

## 9. Implementation sequence and file checklist

Implement in reviewable steps, with all required scope completed before declaring this specification implemented:

1. Shared base/codes/helpers and concrete startup/recovery/operation errors; preserve deck public classes and add cause options. Add contract tests; follow the refined lint policy above.
2. Feedback/diagnostic/reporting separation, GlobalErrorState and ViewErrorState. Wire root, tabs layout and inherited screen boundaries; preserve nested settings and deck-specific handler. Split startup loading from inherited Suspense loading.
3. Normalize essential loader catches and classify startup/reset failures. Decouple Controls from progress reads. Preserve existing reset semantics/tests.
4. Repair focus restoration, study persistence/attempt hydration, extension/refresh feedback and audio promise ownership. Retain mutation contracts; eliminate cause-discarding catches in touched operations.
5. Behavioral tests, device checks, docs updates and final validation. Report deferred work explicitly; do not silently turn it into first-pass scope.

In addition to new paths above, modify the source files named in the audit table and retain/update existing tests:

```text
apps/mobile/tests/unit/app-recovery.test.ts
apps/mobile/tests/unit/error-details.test.ts
apps/mobile/tests/unit/error-state.test.ts
apps/mobile/tests/unit/deck-import-feedback.test.ts
apps/mobile/tests/unit/review-attempt-finalization-order.test.ts
apps/mobile/tests/integration/learning-progress-reset.integration.test.ts
apps/mobile/tests/integration/bundled-deck-startup.integration.test.ts
```

Suggested new tests: `app-error.test.ts`, `error-feedback.test.ts`, `startup-error.test.ts`, `focus-restoration-errors.test.ts`, `study-persistence-errors.test.ts`, and `audio-errors.test.ts`, under `apps/mobile/tests/unit/`. Use meaningful operation scenarios; factor a small pure policy only where it simplifies production ownership and testing. Do not create test-only architecture layers.

The existing `error-state.test.ts` server-renders a provider-independent fallback. That proves fallback rendering but not actual boundary capture, reset or navigator retention: React server rendering does not exercise client error boundaries. Use a client renderer/Router test if available, or record the native manual checks below. Do not describe a markup test as a complete boundary integration test. New development-only testing dependencies are acceptable if required; no production boundary dependency is needed.

Respect `scripts/check-conventions.mjs` and the root lint plugin. Feature presentation must not import persistence implementations. Shared error contract cannot depend on a feature. Keep deck-installer public exports and architecture boundary tests intact. Avoid barrels or root-level provider changes just to bypass checks.

## 10. Acceptance and verification

Required automated behavior:

- AppError object constructor sets stable name/code/context and preserves cause; subclasses keep subtype identity and literal names through delegated construction.
- Non-Error throws/rejections remain available as causes. Unknown errors map safely; native message text is not used to guess actionable classifications.
- Outer startup classification survives nested deck/native errors. Formatter tolerates cyclic causes/objects, limits output and includes codes independent of stack formatting.
- Global and section fallback render without PreferencesProvider/AppServicesProvider; fallback failure can propagate to the parent rather than depending on its own failed provider.
- Reset request makes no immediate deletions; no marker means no deletion; exact owned targets only; partial failure retains marker; retry in the same already-prepared session does not apply a new request. Read/write/init/reset failures retain original causes.
- Controls' reset hook performs no progress reads and remains independent of failed progress hydration.
- Focus resume rejection settles restoring state, preserves other tabs, supports explicit retry, and ignores disposed callback updates.
- Rating/attempt/activation failures are visible; pending-rating rejection prevents subsequent finalization even if the failed promise already left the pending set. Queue cleanup has no unhandled rejection. Successful rating plus failed refresh is not mislabeled as failed rating.
- Feed extension failure preserves loaded cards and deduplication, explicit retry works, and audio failure does not disable text/ratings.
- Import cancellation remains silent; local mutation success/error/busy contracts and deck feedback remain compatible.

Required native checks on a disposable test installation:

1. Inject a migration failure: root fallback appears, original cause and stable code are visible, retry is usable, and no preferences-provider exception replaces it.
2. Inject a Library/Progress screen load failure: bottom tabs remain usable and Controls opens. Test Discover and Focus as well, including the nested Discover stack.
3. Inject a FeedScope/layout failure: section fallback renders safely and no Home action loops into the same failed section.
4. Simulate failed preference reads/writes and failed progress reads: Controls and app recovery remain reachable.
5. Simulate failed attempt/rating persistence, extension and audio operations. Confirm the scoped behavior above and no false success/durability claim.
6. Schedule reset: data remains until Android Force stop/reopen; next startup clears custom data, restores defaults/bundled decks, and never loops after a successful reset. Repeat with interrupted/partial reset.
7. Test the release APK on the older Xiaomi and a newer Android device; capture exact model/OS and original diagnostics before choosing reset. Emulator/export success alone does not prove the friend's failure is resolved.

Run canonical commands from repository root:

```bash
npm run check:mobile
npm run test:mobile
npm run check:architecture
npm run doctor
npm run check:android
```

Keep Expo Doctor enabled. Previous online validation found an existing patch mismatch (`57.0.22` installed versus expected `~57.0.23`); confirm the current result, investigate/report separately, and do not hide it with exclusions. Network failures must be distinguished from configuration failures. Do not change SDK major versions as part of error handling.

Deferred: project-wide Result conversion, all-invariant error taxonomy, production telemetry uploads, persistent global incident state, generic local component boundary framework, native crash interception, automatic reset/restart, and speculative parsing of undocumented SQLite/vendor messages.

## 11. Handoff rationale summary

The original Xiaomi report exposed a secondary fallback bug, not the original device-specific cause. Provider-independent root recovery must remain a hard invariant. SDK 57 screen-boundary inheritance solves navigation containment with the Router's own mechanism. Async ownership is necessary because swallowed persistence failures can silently lose progress despite perfectly working render boundaries. Decoupling Controls from progress loading makes recovery a reachable escape hatch. Preserve the agreed object constructor and validate its runtime contract rather than shaping it around an incompatible syntax rule.

## Refinement round

Second-pass lifecycle review: ignore picker results delivered after hook unmount; once installation/deletion starts, finish the operation and invalidate shared data but suppress state updates, success toasts, and navigation for an unmounted owner. Keep permission-access errors separate from scan errors, guard stale permission callbacks by scan session, and preserve invalid-code feedback across foreground permission refresh. Unmount the camera preview when the sheet is hidden, the screen is unfocused, or the app backgrounds (SDK 57 camera `active` is iOS-only). Hold-to-focus cleanup only hides focus feedback, never a later success toast. Additional regressions live in `deck-delete-lifecycle.test.ts`, `import-deck-sheet.test.ts`, and `flashcard-toast.test.ts`, plus the extended import lifecycle suite. Native behaviour remains a device acceptance requirement.

Deck lifecycle refinement: pause detail reloads during deletion; a successfully loaded but absent deck is an expected missing-content state with only Go to Library, not a thrown load error or pointless retry. Successful deletion dismisses to Library rather than assuming a back-stack entry. Genuine storage errors still reach the route boundary. Delete failures clear when the confirmation is cancelled.

QR imports use SDK 57 `DownloadTask` with an owned abort signal, a 60-second deadline, partial-file cleanup on interruption, and separate download/timeout categories. Cancel is available during downloading, not atomic installation. Cancellation and document-picker dismissal are not failures; overlapping imports are rejected. Download ownership ends on hook unmount. Success uses the existing toast host for a 2.5-second checkmark message. Actionable import errors stay in the sheet and clear on retry, close, or mode change; they do not leak into Library. Camera denial is a neutral access prompt with Allow/Open Settings and a file-import alternative; permissions refresh after returning from Settings. Invalid scans pause until explicit retry.

Regression tests: `deck-details-loading.test.ts`, `deck-package-downloader.test.ts`, `deck-import-lifecycle.test.ts`, and `deck-import-feedback.test.ts`. Hook tests use state/effect doubles, not a native renderer. Device acceptance still requires deleting a QR-imported deck, cancelling/stalling a download, retrying after failure, and denying/granting camera access via Settings.

See `docs/development.md` for the scoped JSX rules and boolean-rendering safety, and `docs/visual-system.md` for concise recovery UI. `ViewErrorBoundary` now owns deck-route reporting too; `ErrorDetails` includes app/platform versions behind its disclosure. Controls merges related interaction settings and places reset within Data without an additional recovery heading or nested card. Focus recovery is a named child component rather than a staged JSX variable. Expo was updated from 57.0.22 to the recommended 57.0.23 patch.

Remaining targeted follow-up: `use-reel-controller.ts` checks the retained critical failure before enqueueing activations/ratings, but already queued work can start after another operation fails. Add execution-time guards (including after awaited attempt creation) with hook-level concurrent-failure regression tests. In-flight writes cannot be cancelled merely by rendering an error boundary. This refinement does not claim to resolve that concurrency edge or reproduce the original Xiaomi failure.

This document preserves design decisions and evidence, not private reasoning traces. Implementation may adjust formatting and local function names to existing conventions, but changing scope ownership, reset safety, class construction, public return contracts or retry semantics requires reporting the divergence and concrete evidence.
