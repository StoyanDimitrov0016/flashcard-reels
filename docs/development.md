# Development guide

## Prerequisites

- Node.js and npm
- Expo Go for a physical device, or an Android/iOS simulator
- EAS CLI only when creating cloud builds

Install dependencies and start Expo:

```bash
npm install
npm start
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
npm run android:machine:start
```

Press `Ctrl+C` to stop the foreground Metro process. To clean up Metro on port
8081, the local emulator, and adb together, run:

```powershell
npm run android:machine:stop
```

The helper accepts `FLASHCARD_ANDROID_EMULATOR` and `FLASHCARD_ANDROID_AVD`
environment-variable overrides if the archived emulator or AVD changes.

While Metro is running and the app is connected, press `j` to open React Native
DevTools. Its Console, Sources, Network, Memory, Components, and Profiler panels
provide JavaScript debugging and React render profiling. Press `m` for the
in-app developer menu.

## Quality checks

```bash
npm run check          # formatting, conventions, lint, and TypeScript
npm run test:run       # test suite once
npm run check:android  # export the Android bundle
npm run verify         # complete project verification
```

Run `npm test` while developing to keep Vitest in watch mode.

## Database changes

The local database schema is defined in `src/infrastructure/sqlite/schema.ts`.

```bash
npm run db:generate    # generate a Drizzle migration
npm run db:check       # validate schema and migrations
```

The repository intentionally uses one clean baseline migration because the pre-refinement database has no production data to preserve. After this migration reset, delete or recreate local development databases before launching the app; the old migration chain is not compatible with the new local baseline. Commit the generated baseline and metadata with future schema changes.

## Android preview builds

The `preview` profile in `eas.json` uses EAS internal distribution and produces an installable APK:

```bash
eas build --platform android --profile preview
```

Share the resulting Expo build page with testers. Internal build URLs are accessible to anyone with the link by default; Expo project settings can require sign-in when restricted access is needed. These APKs are preview artifacts, not Google Play releases.

## Deck authoring, runtime assets, and exports

The dedicated six-card/two-audio demo source lives under `data/demo-deck` and is excluded from EAS uploads. `assets/decks` contains only the generated demo package required at runtime. Installed state is SQLite plus versioned application-owned audio; larger libraries arrive through external `.fcrdeck` import.

Startup reads the demo asset only when it is absent or newer than the installed version. Equal or newer installed versions skip the asset. Runtime verification reads the registry and demo archive directly and never depends on authoring data.

After changing the source library or recordings, run:

```powershell
npm.cmd run decks:packages
npm.cmd run decks:check
```

See [Audio generation](audio-generation.md) before changing the source content or rebuilding recordings.

## Local deck tooling

Inspect a package without installing it:

```powershell
npm.cmd run decks:inspect -- path/to/deck.fcrdeck
```

Generate a small package from an editable JSON fixture:

```powershell
npm.cmd run decks:test:generate -- data/test-decks/versioned/v1/deck.json tmp/v1.fcrdeck
npm.cmd run decks:test:generate -- data/test-decks/versioned/v2/deck.json tmp/v2.fcrdeck
```

The versioned fixtures share a deck ID and demonstrate an unchanged card, an edited card, a removed card, a new card, and optional audio. The generator and inspector use the same package contract and reader as the app; neither command installs or changes app data.
