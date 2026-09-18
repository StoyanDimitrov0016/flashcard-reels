# Mobile app guide

This workspace owns the Expo Router application and all native configuration.
Run commands from the repository root through the root aliases or with
`-w @flashcard-reels/mobile`; do not invoke a separately installed Expo CLI.

## Architecture

- Keep routes and application composition in `src/app`.
- Keep feature code in `src/features`; infrastructure adapters belong in the
  feature's infrastructure layer or shared `src/infrastructure`.
- Preserve the deck-installer and app-asset boundaries enforced by architecture
  tests. Do not import Expo, SQLite, filesystem, or archive details into public
  domain/application APIs.
- Treat `drizzle/` as generated migration output. Change
  `src/infrastructure/sqlite/schema.ts`, run the workspace `db:generate` script,
  and review the generated SQL and metadata.

## Validation

Use `npm run check:mobile` and `npm run test:mobile` for ordinary changes. Run
`npm run verify:mobile` when changing native dependencies, Expo/Metro/Babel/app
configuration, migrations, bundled decks, or Android bundling. Keep Expo Doctor
failures visible and fix their cause.

The React component convention formatter is part of the mobile format workflow;
do not replace it with generic formatter settings.
