# Development

## Commands

Root scripts orchestrate the whole repository:

```bash
npm run dev:mobile     # Expo; scan with Expo Go or press a / i / w
npm run dev:web        # Next.js portal
npm run check          # formatting, import order, custom lint rules, lint, types
npm test               # every workspace's tests once
npm run verify         # check, tests, dead-code analysis, production builds
```

For routine work, run the workspace's own scripts from `apps/mobile` or `apps/web` so unrelated
workspaces are not validated. In `apps/mobile`, `npm run verify` adds Drizzle, architecture,
Expo Doctor, and Android export checks; run it after native, Expo, database, bundled-deck, or
Android changes. Run Vitest with `--watch` for an interactive loop.

Expo and Next.js commands must run in their workspace. `npx expo start` from the root misses
`expo-router/entry` and looks for a root `App` file.

While Metro runs, press `j` for React Native DevTools and `m` for the developer menu.

## CI

`.github/workflows/ci.yml` runs on every pull request, whatever its target, and on pushes to `main`: formatting,
lint, types, all tests, a production dependency audit, the web build, database validation,
dead-code checks, Expo Doctor, and an Android export. Every job installs through
`.github/actions/setup-workspace` with the Node version from `.node-version`, the npm version
from the root `package.json`, and `npm ci`. Pushing a feature branch alone does not run CI, and
re-running an old workflow does not pick up newer commits.

## Dependencies

- Expo SDK packages, React, React Native, and their native libraries follow the installed SDK.
  Update them with `npx expo install --check` in `apps/mobile`, not to npm `latest`. Keep
  Expo Doctor's check on, and update the mobile manifest and root lockfile together.
- Other dependencies track their latest releases.
- All workspaces share the one `@types/react` version the Expo SDK pins. A second copy breaks
  the web type check.
- `react-native-tab-view` and `react-native-pager-view` are loaded by other libraries, not
  imported. `knip.json` ignores them, and an architecture test keeps them declared.
- `unicorn/custom-error-definition` is off because errors delegate their name to a shared
  constructor. Error-contract tests check names, inheritance, codes, and causes instead.

## Database changes

The schema lives in `apps/mobile/src/infrastructure/sqlite/schema.ts`, and `drizzle/` is its
generated output.

```bash
npm run db:generate -w @flashcard-reels/mobile   # generate a migration
npm run db:check -w @flashcard-reels/mobile      # validate schema and migrations
```

Until Phase 0 closes, regenerate one `0000` baseline from the current schema instead of adding
compatibility migrations. When you do, rename `DATABASE_NAME` in `src/infrastructure/sqlite/database.ts`
and add the new name to the reset list in `src/infrastructure/app-recovery.ts`, so existing installs
open a fresh database instead of failing on an unknown migration history. From the first daily-use
APK, every change is a forward migration. Commit generated migrations and metadata with the schema.

## Android builds

```bash
cd apps/mobile
eas build --platform android --profile preview      # installable APK, internal distribution
eas build --platform android --profile production   # release artifact
```

Both profiles auto-increment the remote build version. Preview build pages are open to anyone
with the link unless Expo project settings require sign-in. Production builds run manually or
from `mobile-v*` tags. The README links the current preview.

## This Windows machine

These notes apply only to the owner's current laptop. Remove them when newer tools work.

- **Emulator:** Android Emulator 37.1.11 freezes before boot. The archived 36.6.11 in
  `D:\AndroidEmulatorArchive\36.6.11` works with the `Expo_API_35_Stable` AVD. Override with
  `FLASHCARD_ANDROID_EMULATOR` and `FLASHCARD_ANDROID_AVD`.

  ```powershell
  npm run android:machine:start -w @flashcard-reels/mobile   # boot and open in Expo Go
  npm run android:machine:stop -w @flashcard-reels/mobile    # stop Metro, emulator, adb
  ```

- **Gradle:** set `GRADLE_USER_HOME=D:\g`. The Cyrillic user path breaks Prefab, and a longer
  path inside the repository breaks Ninja's 260-character limit. `D:\g\gradle.properties` runs
  the Kotlin compiler in-process. Gradle cannot download Maven artifacts on this machine, so
  exact versions are kept in the ignored `apps/mobile/android/.local-maven` and mapped by
  `D:\g\local-artifacts.gradle`.

- **Local release APK** (embeds JavaScript, needs no Metro), from `apps/mobile/android`:

  ```powershell
  $env:GRADLE_USER_HOME = 'D:\g'
  $env:NODE_ENV = 'production'
  .\gradlew.bat app:assembleRelease -x lint -x test -x extractReleaseAnnotations -x generateReleaseLintModel -x generateReleaseLintVitalModel -x lintVitalAnalyzeRelease -x lintVitalReportRelease -x lintVitalRelease --offline --init-script D:\g\local-artifacts.gradle --configure-on-demand --build-cache -PreactNativeArchitectures=x86_64
  ```

  Android installs an update only over an app signed with the same key. The EAS key lives in
  EAS credentials, not in this project, so keep local builds on the emulator and install only
  EAS builds on the phone. Otherwise an update needs an uninstall, which deletes all data.

## Maestro

Flows in `apps/mobile/.maestro` cover continuing and starting fresh after a reinstall, deleting
archived progress, cancelling the full data reset, and importing and exporting a progress
backup. They use the versioned test deck and its checked-in audio fixture.

Install the Maestro CLI (on this machine it is in `%TEMP%\flashcard-maestro-cli\maestro\bin`),
build an APK with embedded JavaScript, then run from the repository root:

```powershell
$env:MAESTRO_CLI_NO_ANALYTICS = '1'
./apps/mobile/scripts/run-maestro.ps1 -ApkPath ./apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

The runner boots the emulator, installs the APK, generates the deck package, copies it and the
backup fixture to Downloads, and runs every flow with cleared app state. Omit `-ApkPath` when
the APK is already installed. The emulator keeps running afterwards. The file picker taps the
Downloads drawer at `30%, 27%`; adjust it if the picker layout changes.
