# Architecture

Flashcard Reels is an Expo and React Native application organized as feature slices with explicit domain, application, infrastructure, and presentation boundaries.

## Feature structure

The main feature areas under `src/features` are:

- `audio` resolves and plays bundled answer recordings;
- `decks` manages deck metadata and appearance preferences;
- `flashcards` provides card content;
- `learner-profile` aggregates recall history and calculates adaptive priority;
- `reels` prepares and presents the swipeable feed;
- `study` owns sessions, review attempts, and card recurrence.

Within a feature, the layers have distinct responsibilities:

- **Domain** defines models, policies, and repository/service contracts.
- **Application** coordinates use cases through those contracts.
- **Infrastructure** implements persistence and platform integrations.
- **Presentation** contains React components, screens, hooks, and UI state.

`src/infrastructure/app-services.tsx` is the composition root. It connects application services to SQLite repositories and exposes them to the UI. Convention checks prevent presentation and domain code from importing persistence details directly.

## Local persistence

Expo SQLite stores decks, flashcards, appearance settings, study sessions, feed positions, review attempts, recurrences, and learner profiles. Drizzle ORM defines the schema in `src/infrastructure/sqlite/schema.ts`; migrations live in `drizzle/`.

The database uses constraints and transactions to preserve invariants such as one active session per scope, one card per reel position, valid recall ratings, and internally consistent learner-profile counters.

## Study behavior

Mixed and focused sessions are independent and persist their prepared feed order. The feed is materialized in small batches around the current reel position.

An **Again** rating schedules the card roughly eight positions later, while **Hard** schedules it roughly sixteen positions later; jitter prevents a rigid pattern. Historical ratings also create a weighted shuffle bag: struggling cards receive more copies and well-known cards receive fewer.

## Verification

Behavior tests cover feed ordering, recurrence, session lifecycle, learner-profile aggregation, SQLite invariants, and deck appearance. `npm run verify` runs the complete formatting, static analysis, test, database, architecture, Expo, and Android export checks.
