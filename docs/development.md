# Development guide

## JSX and error conventions

React permits JSX variables; avoiding local JSX staging is a project readability preference, not a claim that it is invalid React. Derive conditions/data above the return, keep markup in the returned tree, and extract substantial reused branches into named, module-scope components. Keep hooks unconditional. See [React conditional rendering](https://react.dev/learn/conditional-rendering) and [Codebase Preferences](codebase-preferences.md).

`unicorn/custom-error-definition` is disabled because our errors delegate their name to the shared object constructor; the syntactic rule cannot validate that contract. Runtime error-contract tests, rather than repeated suppression comments, check names, inheritance, codes and causes. Other lint rules remain enabled.

## Prerequisites

- Node.js and npm
- Expo Go for a physical device, or an Android/iOS simulator
- EAS CLI only when creating cloud builds

Install dependencies and start Expo:

```bash
npm install
npm run dev:mobile
```

For app-local development, change to the mobile workspace and use its local script:

```bash
cd apps/mobile
npm run dev
```

From the Expo terminal, scan the QR code or press `a`, `i`, or `w` for Android, iOS, or web.

## Local Windows emulator workaround

These commands are intentionally specific to Stoyan's current Windows laptop.
Android Emulator 37.1.11 freezes before guest boot on this machine; Google's
archived Emulator 36.6.11 at `D:\AndroidEmulatorArchive\36.6.11` works with the
`Expo_API_35_Stable` AVD. This is a temporary host-tool workaround, not a
portable project or CI requirement. Re-test a newer stable Android Emulator
when Google publishes one, then remove this section and the two machine scripts
once the managed version boots normally.

Start the emulator, wait for Android to finish booting, and open the app in
Expo Go:

```powershell
npm run android:machine:start -w @flashcard-reels/mobile
```

Press `Ctrl+C` to stop the foreground Metro process. To clean up Metro on port
8081, the local emulator, and adb together, run:

```powershell
npm run android:machine:stop -w @flashcard-reels/mobile
```

The helper accepts `FLASHCARD_ANDROID_EMULATOR` and `FLASHCARD_ANDROID_AVD`
environment-variable overrides if the archived emulator or AVD changes.

While Metro is running and the app is connected, press `j` to open React Native
DevTools. Its Console, Sources, Network, Memory, Components, and Profiler panels
provide JavaScript debugging and React render profiling. Press `m` for the
in-app developer menu.

## Quality checks

Use the root scripts for repository-wide validation:

```bash
npm run check          # formatting/import order, custom-rule tests, lint, and types
npm test               # all workspace test suites once
npm run verify         # root checks, tests, dead-code analysis, and production builds
```

For focused mobile work, run local scripts from `apps/mobile`. Use the extended
verification after native, Expo, database, bundled-deck, or Android changes:

```bash
npm run check
npm test
npm run verify         # includes Drizzle, architecture, Doctor, and Android export
```

See [Monorepo](monorepo.md) for command ownership. Run Vitest with `--watch` when
an interactive test loop is useful.

CI uses `.github/actions/setup-workspace` in every job to install the Node version from `.node-version`, the exact npm version declared in root `package.json`, and dependencies with root `npm ci`. The npm cache stores downloaded packages, not installed `node_modules`; the committed lockfile determines dependency versions. Mobile validation prints the checked-out commit and installed Expo version before running Doctor. Keep Doctor's compatibility check enabled and update the mobile manifest and root lockfile together when Expo recommends a patch. Re-running an old workflow run does not pick up newer commits. Feature branches are validated by pull requests targeting `main`; simply pushing a feature branch does not trigger this workflow.

Tests are organized by execution boundary: `tests/unit` holds pure deterministic logic,
`tests/integration` exercises real SQLite, filesystem, and application boundaries, and
`tests/architecture` protects static module and runtime-resource invariants. Native gestures and
presentation remain in the manual device checklist.

## Database changes

The local database schema is defined in `apps/mobile/src/infrastructure/sqlite/schema.ts`.

```bash
npm run db:generate -w @flashcard-reels/mobile # generate a Drizzle migration
npm run db:check -w @flashcard-reels/mobile    # validate schema and migrations
```

Phase 0 uses one clean `0000` migration baseline. Whenever that baseline is regenerated, recreate local development databases before launching the app. Commit the generated baseline and metadata with schema changes.

## Android preview builds

The `preview` profile in `eas.json` uses EAS internal distribution and produces an installable APK:

```bash
eas build --platform android --profile preview
```

Share the resulting Expo build page with testers. Internal build URLs are accessible to anyone with the link by default; Expo project settings can require sign-in when restricted access is needed. These APKs are preview artifacts, not Google Play releases.

The current preview is available from the [latest APK build page](https://expo.dev/accounts/stoyan_dimitrov/projects/flashcard-reels/builds/7ead0247-4974-48b9-abe3-9784b4fab465).

## Android UI scenarios with Maestro

The first Maestro flows in `apps/mobile/.maestro` cover archived learning progress: continue after reinstall, start fresh after reinstall, and delete archived progress. They use the versioned test deck, including its checked-in audio fixture, so no audio generation is needed.

Install the [Maestro CLI](https://github.com/mobile-dev-inc/maestro-docs/blob/main/maestro-cli/how-to-install-maestro-cli/README.md) and make `maestro` available on PATH. Build a current APK with embedded JavaScript (such as a local release APK or an EAS preview APK), then run from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File apps/mobile/scripts/run-maestro.ps1 -ApkPath C:\path\to\flashcard-reels.apk
```

The runner starts this machine's known-working Android emulator through `android-machine.ps1 -Action Ready`, installs the APK, generates the fixture package, copies it to Android Downloads, and runs each flow with cleared app state. If the current APK is already installed, omit `-ApkPath`. The runner leaves the emulator running; use `npm run android:machine:stop -w @flashcard-reels/mobile` when finished. A Maestro flow requires an installed APK; the JavaScript-only Android export check does not create one.

These scenarios complement the SQLite integration tests. Device picker labels and native gestures should be checked on the target emulator before making this suite a required CI gate.

## Android production builds

The `production` profile produces the Android release artifact and increments the remote build version. Start it manually from EAS:

```bash
cd apps/mobile
eas build --platform android --profile production
```

Repository pull requests and pushes to `main` are validated by GitHub Actions. EAS remains the release-build system and uses the Expo project's EAS credentials.

## Deck authoring, runtime assets, and exports

The dedicated six-card/two-audio demo source lives under `data/demo-deck` and is excluded from EAS uploads. `assets/decks` contains only the generated demo package required at runtime. Installed state is SQLite plus versioned application-owned audio; larger libraries arrive through external `.fcrdeck` import.

Startup reads the demo asset only when it is absent or newer than the installed version. Equal or newer installed versions skip the asset. Runtime verification reads the registry and demo archive directly and never depends on authoring data.

After changing the source library or recordings, run:

```powershell
npm.cmd run decks:packages -w @flashcard-reels/mobile
npm.cmd run decks:check -w @flashcard-reels/mobile
```

See [Audio generation](audio-generation.md) before changing the source content or rebuilding recordings.

## Local deck tooling

Inspect a package without installing it:

```powershell
npm.cmd run decks:inspect -w @flashcard-reels/mobile -- path/to/deck.fcrdeck
```

Generate a small package from an editable JSON fixture:

```powershell
npm.cmd run decks:test:generate -w @flashcard-reels/mobile -- data/test-decks/versioned/v1/deck.json tmp/v1.fcrdeck
npm.cmd run decks:test:generate -w @flashcard-reels/mobile -- data/test-decks/versioned/v2/deck.json tmp/v2.fcrdeck
```

The versioned fixtures share a deck ID and demonstrate an unchanged card, an edited card, a removed card, a new card, and optional audio. The generator and inspector use the same package contract and reader as the app; neither command installs or changes app data.
