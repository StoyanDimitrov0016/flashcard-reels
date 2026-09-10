# Architecture

Flashcard Reels is an Expo and React Native application organized as feature slices with explicit domain, application, infrastructure, and presentation boundaries.

## Feature structure

The main feature areas under `src/features` are:

- `audio` resolves and plays recordings installed in application-owned storage;
- `decks` manages deck metadata and appearance preferences;
- `decks/deck-installer` hides portable package reading, validation, version checks, serialization, audio lifecycle, SQLite updates, and session invalidation behind a narrow API;
- `flashcards` provides card content;
- `learner-profile` aggregates recall history for reporting and progress views;
- `reels` prepares and presents the swipeable feed;
- `study` owns sessions, review attempts, and card recurrence.

Within a feature, the layers have distinct responsibilities:

- **Domain** defines models, policies, and repository/service contracts.
- **Application** coordinates use cases through those contracts.
- **Infrastructure** implements persistence and platform integrations.
- **Presentation** contains React components, screens, hooks, and UI state.

`src/infrastructure/app-services.tsx` is the composition root. It connects application services to SQLite repositories, package storage, installed audio, and the UI. Expo document picking, package file access, and audio filesystem access are isolated in feature infrastructure. Convention checks prevent presentation and domain code from importing persistence details directly.

## Deck packages

Deck content is transported as `.fcrdeck` ZIP-compatible archives. Contract validation, ZIP reading, limits, serialization, package-audio lifecycle, and SQLite installation live under `src/features/decks/deck-installer/internal`. The module's public `index.ts` exposes application-owned file/result types, typed validation/version errors, and `installFromFile`. The Library screen selects a file and invokes that boundary; bundled byte installation remains an internal composition concern. Presentation maps installer results and errors to short feedback while retaining the technical error object in hook state. The `decks:inspect` and `decks:test:generate` commands intentionally reuse the internal canonical reader, schema, and writer through explicit script-level architecture exceptions; they do not provide installation or package-management operations.

One small demo package is generated from the dedicated `data/demo-deck` source and checked into `assets/decks`. Database startup installs the demo through the same installer used for document-picker imports. Larger decks are external imports. `bundled-deck-registry.json` is the shared runtime, test, and Node-verification source of truth for package identity and local appearance.

## Local persistence

Expo SQLite stores decks, flashcards, appearance settings, study sessions, feed positions, review attempts, recurrences, and learner profiles. Drizzle ORM defines the schema in `src/infrastructure/sqlite/schema.ts`; the reset migration baseline lives in `drizzle/`. Decks store a package version; flashcards use canonical `order` ordering and an `active` flag.

The database uses constraints and transactions to preserve invariants such as one active session per scope, one card per reel position, valid recall ratings, internally consistent learner-profile counters, and collision-free package reordering. Normal flashcard lists and counts return active cards only; direct ID lookups can still resolve inactive historical rows.

Package updates keep flashcard rows instead of deleting them. This preserves foreign-key references from learner profiles, review attempts, and materialized study sessions. Affected active focused/mixed sessions are completed so the next study entry rebuilds from current active content.

Installed package audio is staged in temporary application-owned storage, activated before SQLite, and stored at `deck-audio/<deck-id>/<deck-version>/`. Playback resolves `audio/<card-id>.answer.mp3` directly from the deck/version location and does not scan unrelated decks. A retry may replace a same-version directory when SQLite does not identify that version as installed, making cleanup-failure residue recoverable.

## Study behavior

Mixed and focused sessions are independent and persist their prepared feed order. The feed is materialized in small batches around the current reel position. The last five visible reels form an editable provisional tail; activation persists position, consumes recurrence, finalizes newly committed attempts, records the visible card, and only then extends the feed.

An **Again** rating schedules the card roughly eight positions later, while **Hard** schedules it roughly sixteen positions later; jitter prevents a rigid pattern. The learning engine composes the materialized feed from pressure, new-card, and low-pressure groups, respecting recent-card variety across groups before relaxing recency. Finalized repeated reviews are applied to FSRS in global `ratedAt` order per card, while learner-profile counters remain reporting data. Recent history records cards when they become visible, including recurrence and anchors.

## Verification

Behavior tests cover feed ordering, recurrence, session lifecycle, learner-profile aggregation, SQLite invariants, package lifecycle and concurrency, inactive cards, audio failure recovery, fail-closed ZIP metadata, and demo bootstrap. Invalid-package scenarios assert both database and permanent-audio immutability. `npm run verify` validates runtime packages before the complete static, test, database, architecture, Expo, and Android checks.
