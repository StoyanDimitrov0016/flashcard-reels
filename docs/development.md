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
