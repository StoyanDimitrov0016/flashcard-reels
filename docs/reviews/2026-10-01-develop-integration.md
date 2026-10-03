# Develop integration review — October 1, 2026

## Scope and history

Integrated in the requested order:

1. `feat/curated-deck-packages-v1`
2. `chore/naming-alignment`, `refactor/names-code-and-ui`, `refactor/names-commit`,
   `refactor/names-database`, `refactor/names-backup`
3. `feat/decks-destination`

The Decks destination UI was excluded from review. Its replayed commit has exactly the original
tree. Review fixes follow it and do not change its screens or layout.

Separated curated catalog JSON edits from lesson-link implementation and schema 1 installation;
separated publication-key fixes from revision 2 catalog preparation. Reworded the web schema
reader and curated preparation command commits. Split the broad naming commit into audio,
preferences, navigation, and rating changes; split session vocabulary from SQLite row identity.
Generated database SQL stays with the adapters that require it.

The curated/develop merge preserves both parents and the original resolved tree. Before review
fixes, the integrated tree was identical to the original stack. Original branch tips are retained
under `backup/pre-integration-*`. No remote branches were pushed or force-pushed.

## Findings addressed

### Reject author changes before import side effects

A same-revision package with another author was accepted as a no-op. A higher-revision package
with another author was rejected only after settling the active session and staging audio. The
installer now reads installed author/revision together and rejects the change before either
operation. SQLite independently rechecks author identity before its no-op decision.

Regression scenarios use real parsing, study services, FSRS, and SQLite. They check retained active
sessions, provisional ratings, memory state, and installed audio after rejection.

### Restore must respect installed card ownership

A structurally valid backup could assign an installed card ID to another deck and replace its
learning state. Restore now checks installed ownership inside the transaction before deleting
learner data. The service-level regression checks preserved learning/session history and cleanup
of the failed candidate safety copy.

The cross-device backup scenario also continues studying on the next day after restore. It checks
preserved transferred events, another counted review, one memory state, and another FSRS
repetition. Exporting the resulting state checks the portable backup contract again.

### Application services depend on abstractions

The reel service constructed its composer through an application factory that loaded concrete
implementations. It now receives a `FeedComposer`; infrastructure owns factory construction.

The architecture guard parses imports/re-exports and resolves them with the real TypeScript
configuration. It follows local dependencies transitively, including type-only imports, and
rejects adapters, UI, or native dependencies from domain/application code. Presentation reaches
the service context through dependency hooks; direct adapter imports are rejected. A temporary
mutation proved that a type-only adapter dependency hidden behind a shared re-export fails the
guard. That mutation was removed.

### Behavioral tests and device selectors

Removed five layout-helper mapping tests, the test enumerating default preferences, and the exact
toast-duration assertion. Retained toast ownership/cleanup behavior. Removed redundant layout
exports and forwarding functions exposed only for the old tests.

Replacement rating tests press the actual controls through the real layout provider. Across all
three positions and both directions, buttons submit the intended ratings and expose selection;
disabled controls submit no rating or haptic feedback. Native primitives are mocked, so these
tests protect React behavior rather than native gestures or pixel layout.

Retained deterministic policies and SQLite guardrails for daily FSRS, recurrence, bounded
sessions, commit recovery, reset, update identity, archive/reinstall, failed restore, and package
limits. Contrast checks protect readability; runtime dependency checks protect native launch;
CSS/TS token consistency protects a shared contract. These do more than restate constants.

Corrected Maestro's stale `Recall level: Good` selector to `Recall rating: Good`. Added an
archive/restart/reinstall/continue/restart flow asserting user-visible review counts.

## Validation and handoff

- Repository `npm run verify`: formatting, custom lint rules, lint, type checks, 409 tests
  (347 mobile, 39 web, 23 deck-contract), dead-code analysis, and web production build.
- Mobile `npm run db:check`: canonical Drizzle baseline check.
- Mobile `npm run check:android`: bundled package validation and Android JavaScript export.
- Mobile `npm run doctor`: 21/21 checks after aligning SDK 57 patch dependencies.
- Maestro runner attempted: stopped at `ANDROID_HOME is required`. This environment also lacks
  ADB, Java, Maestro, and the documented emulator. All six flows need a real run against a current
  APK; no successful native run is claimed here.

For the phone check, run `npm run dev:mobile` from the root and open the SDK 57 app in Expo Go.
The naming stack intentionally selects the Phase 0 v5 database and v2 preferences key; existing
development data is not migrated. The regenerated baseline follows the mobile repository guide.

For Maestro, provision the prerequisites in [the device handoff](../maestro-device-run-handoff.md),
build a current APK with embedded JavaScript, and run
`apps/mobile/scripts/run-maestro.ps1 -ApkPath <current-apk>`. Android export does not produce an
APK or verify native interaction.

## Follow-up improvements

1. **Exercise real React scanner state.** `import-deck-sheet.test.ts` replaces React state/effects
   with a custom slot harness. Replace it with mounted interactions and mocked camera/AppState
   boundaries so React itself exercises cleanup and re-render behavior.
2. **Share runtime composition with integration scenarios.** `createScenarioGraph` duplicates
   production wiring. Extract a platform-neutral composition entry point with explicit database,
   clock, ID, and native gateway inputs. Keep SQLite/FSRS real; avoid a parallel in-memory study
   engine.
3. **Make native smoke tests portable.** Run the six flows, then add hold-to-Focus preserving the
   current card/rating, background/resume, and offline lesson/audio scenarios. Replace the Downloads
   coordinate selector when the target picker exposes a stable selector. Separate machine-specific
   emulator provisioning from scenario behavior.
4. **Broaden package preflight deliberately.** Cross-deck card/lesson ID collisions are protected
   by the install transaction. Consider checking them before settling sessions as well, while
   retaining the transactional integrity check.
5. **Stress failure boundaries.** Add realistic filesystem activation/cleanup failures, restores
   spanning several insert chunks, and malformed scheduler-state backups. Assert retained user
   state and recoverability rather than exact adapter call sequences.
6. **Plan released-data compatibility.** Before a release containing durable user data, adopt
   incremental, rollback-tested migrations and a versioned backup evolution policy. The Phase 0
   baseline-reset convention must not silently become a released-data migration strategy.

New tests should answer: which plausible user-visible regression does this catch? Keep clocks,
IDs, and local packages deterministic, and assert behavior at the appropriate public boundary.
