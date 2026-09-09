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

## Bundled study content and audio

The source library is stored under `data/technical_flashcard_library`. Audio files remain source inputs, while generated `.fcrdeck` archives under `assets/decks` are the application content transport. The app checks the keyed bundled registry's deck ID/version before reading each archive, then installs only packages that need work. Bundled decks and user-selected packages share one validation, audio, and update path.

After changing the source library or recordings, run:

```powershell
npm.cmd run audio:generate
npm.cmd run decks:packages
```

See [Audio generation](audio-generation.md) before changing the source content or rebuilding recordings.
