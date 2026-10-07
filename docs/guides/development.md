# Development

## Setup

You need the Node.js version in `.node-version` (24), the npm version in the root `package.json`
`packageManager` field, and Expo Go or an Android/iOS simulator. The EAS CLI is needed only for
cloud builds.

```bash
npm install
npm run dev:mobile   # Expo; scan the QR code, or press a / i / w
npm run dev:web      # Next.js portal; configure apps/web/.env.local first
```

Expo commands must run in `apps/mobile`, where `expo-router/entry` is configured. Running
`npx expo start` from the root makes Expo look for a root-level `App` file. Inside a running Metro
session, `j` opens React Native DevTools and `m` opens the in-app developer menu.

## Validate

Work in the workspace you changed and use its scripts. Run the root scripts only for changes that
cross workspaces.

| Scope                         | Command (from the workspace)      | Covers                                                                 |
| ----------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| Any workspace                 | `npm run check`                   | Format, lint, types                                                    |
| Any workspace                 | `npm test`                        | Vitest suites (`--watch` for a loop)                                   |
| Mobile, native or data change | `npm run verify` in `apps/mobile` | Above plus `db:check`, Expo Doctor, bundled-deck check, Android export |
| Repository                    | `npm run verify` at the root      | `check` (with custom lint-rule tests), tests, `knip` dead code, builds |

Run `apps/mobile` `verify` after native, Expo, database, bundled-deck, or Android changes.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`; pushing a feature
branch without a pull request doesn't trigger it. Every job sets up the workspace through
`.github/actions/setup-workspace`: the Node version from `.node-version`, the exact npm version from
`packageManager`, and `npm ci`. Jobs:

- **Quality and tests:** root `check`, `test`, `check:dead-code`, and
  `npm audit --omit=dev --audit-level=high`.
- **Web build:** `npm run build -w @flashcard-reels/web`.
- **Mobile validation:** `db:check`, Expo Doctor (keep its compatibility check on, and update the
  mobile manifest and lockfile together when it recommends a patch), and the Android export.

EAS builds are separate and start manually or from `mobile-v*` tags.

## Database changes

The schema is `apps/mobile/src/infrastructure/sqlite/schema.ts`; `apps/mobile/drizzle/` is
generated. During Phase 0 there is one `0000` baseline and no migrations:

1. Change the schema.
2. Delete `drizzle/0000_*.sql` and `drizzle/meta/`. Deleting only the metadata files leaves an empty
   directory that Drizzle Kit expects to contain a journal.
3. Run `npm run db:generate -w @flashcard-reels/mobile`, then `db:check`.
4. Bump `DATABASE_NAME` in `src/infrastructure/sqlite/database.ts` and add the new file to
   `DATABASE_FILES` in `src/infrastructure/app-recovery.ts`, along with its test.
5. Commit the schema, baseline, and metadata together. Existing development installs start with a
   fresh database; restore progress from a backup.

## Builds

From `apps/mobile`:

```bash
eas build --platform android --profile preview      # installable APK, internal distribution
eas build --platform android --profile production   # release artifact, remote build number
```

Preview builds aren't Google Play releases. Anyone with an internal build link can open it unless
the Expo project requires sign-in. The current preview link is in the root [README](../../README.md).

## Dependencies

Expo SDK packages, React, React Native, and native libraries follow the installed Expo SDK: run
`npx expo install --check` in `apps/mobile`. Other dependencies track their latest releases. Keep a
single `@types/react` across workspaces.

Some mobile dependencies are loaded by other libraries instead of being imported:
`react-native-tab-view` (Expo Router TopTabs) and `react-native-pager-view` (native pager).
`knip.json` ignores them, and an architecture test keeps them declared. Removing the pager once
crashed release builds on launch.

## Local Windows emulator

These scripts are specific to the owner's laptop, where Android Emulator 37.1.11 freezes before
boot. The archived Emulator 36.6.11 at `D:\AndroidEmulatorArchive\36.6.11` works with the
`Expo_API_35_Stable` AVD. Delete this section and both scripts once a newer stable emulator boots.

```powershell
npm run android:machine:start -w @flashcard-reels/mobile   # boot, wait, open in Expo Go
npm run android:machine:stop -w @flashcard-reels/mobile    # stop Metro (8081), emulator, adb
```

`FLASHCARD_ANDROID_EMULATOR` and `FLASHCARD_ANDROID_AVD` override the paths. Building a local
release APK for Maestro is covered in the [testing guide](testing.md#device-scenarios-maestro).
