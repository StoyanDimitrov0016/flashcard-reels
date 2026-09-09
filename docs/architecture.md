# Architecture

Flashcard Reels is an Expo and React Native application organized as feature slices with explicit domain, application, infrastructure, and presentation boundaries.

## Feature structure

The main feature areas under `src/features` are:

- `audio` resolves and plays recordings installed in application-owned storage;
- `decks` manages deck metadata and appearance preferences;
- deck package contracts and installation coordinate portable content imports;
- `flashcards` provides card content;
- `learner-profile` aggregates recall history and calculates adaptive priority;
- `reels` prepares and presents the swipeable feed;
- `study` owns sessions, review attempts, and card recurrence.

Within a feature, the layers have distinct responsibilities:

- **Domain** defines models, policies, and repository/service contracts.
- **Application** coordinates use cases through those contracts.
- **Infrastructure** implements persistence and platform integrations.
- **Presentation** contains React components, screens, hooks, and UI state.

`src/infrastructure/app-services.tsx` is the composition root. It connects application services to SQLite repositories, package storage, installed audio, and the UI. Convention checks prevent presentation and domain code from importing persistence details directly.

## Deck packages

Deck content is transported as `.fcrdeck` ZIP-compatible archives. The canonical contract lives in `src/features/decks/contracts/deck-package.schema.ts`; archive reading and filesystem access live in infrastructure; installation orchestration lives in the application layer. The Library screen only selects a file and invokes the import use case.

Bundled packages are generated from `data/technical_flashcard_library` and checked into `assets/decks`. Database startup installs them through the same importer used for document-picker imports. Deck appearance remains application/user state and is not part of a package.

## Local persistence

Expo SQLite stores decks, flashcards, appearance settings, study sessions, feed positions, review attempts, recurrences, and learner profiles. Drizzle ORM defines the schema in `src/infrastructure/sqlite/schema.ts`; migrations live in `drizzle/`. Decks store a package version; flashcards use canonical `position` ordering and an `active` flag.

The database uses constraints and transactions to preserve invariants such as one active session per scope, one card per reel position, valid recall ratings, internally consistent learner-profile counters, and collision-free package reordering. Normal flashcard lists and counts return active cards only; direct ID lookups can still resolve inactive historical rows.

Package updates keep flashcard rows instead of deleting them. This preserves foreign-key references from learner profiles, review attempts, and materialized study sessions. Affected active focused/mixed sessions are completed so the next study entry rebuilds from current active content.

Installed package audio is staged in temporary application-owned storage, committed to SQLite, then promoted to a replaceable per-deck directory. Playback resolves those files by stable deck/card identity and does not know whether the source was bundled or imported.

## Study behavior

Mixed and focused sessions are independent and persist their prepared feed order. The feed is materialized in small batches around the current reel position.

An **Again** rating schedules the card roughly eight positions later, while **Hard** schedules it roughly sixteen positions later; jitter prevents a rigid pattern. Historical ratings also create a weighted shuffle bag: struggling cards receive more copies and well-known cards receive fewer.

## Verification

Behavior tests cover feed ordering, recurrence, session lifecycle, learner-profile aggregation, SQLite invariants, deck appearance, package lifecycle updates, inactive cards, audio/package validation, and deck appearance. `npm run verify` runs the complete formatting, static analysis, test, database, architecture, Expo, and Android export checks.
