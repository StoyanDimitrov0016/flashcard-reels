# Architecture

An orientation for people and agents new to the repository. What the app does is in
[functional requirements](functional-requirements.md); conventions are in
[codebase preferences](codebase-preferences.md).

## Repository

An npm-workspaces Turborepo:

- `apps/mobile`: the Expo app. Local-first; studying works without an account, network, or
  the portal.
- `apps/web`: the internal Next.js portal that serves decks to the phone.
- `packages/deck-contract`: the `.fcrdeck` schema, limits, and archive parsing, shared by the
  app, the portal, and the deck tooling.
- `packages/design-tokens`: framework-neutral colors as TypeScript objects for React Native and
  CSS variables for the web.

Configuration ownership is listed in the root `AGENTS.md`. Each workspace has its own
`AGENTS.md` with its invariants.

## Mobile app

### Layout

- `src/app`: Expo Router routes. `app/_layout.tsx` is the composition root.
- `src/features/<feature>`: one folder per feature, split into `domain`, `application`,
  `infrastructure`, and `presentation` layers. Features: `reels`, `study`, `learning-engine`,
  `flashcards`, `flashcard-progress`, `decks`, `lessons`, `audio`, `preferences`,
  `progress-backup`.
- `src/infrastructure`: SQLite setup, the service container, and app-wide recovery.
- `src/shared`: feature-agnostic code and shared UI.

### Dependency direction

| Layer                        | May use                                           | Must not use                                   |
| ---------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `domain`                     | domain and neutral shared code                    | everything else, including React, Expo, SQLite |
| `application`                | domain, contracts, neutral shared code            | infrastructure, presentation, frameworks       |
| `infrastructure`             | application ports, domain, contracts              | presentation                                   |
| `presentation/controllers`   | application APIs, domain types, presentation      | infrastructure and persistence                 |
| `presentation/dependencies`  | the container via `@/infrastructure/app-services` | other infrastructure                           |
| other `presentation`, routes | presentation and domain types                     | application, infrastructure, the container     |

Oxlint enforces these edges for `@/` alias imports. Relative cross-layer imports and dynamic
imports need review. Import a feature by layer (`@/features/x/domain`), not by its root.

### Domain model

| Concept                  | Table                       | Meaning                                                           |
| ------------------------ | --------------------------- | ----------------------------------------------------------------- |
| `Deck`                   | `decks`                     | Installed package content and its stable identity.                |
| `Flashcard`              | `flashcards`                | A card's question and answer, identified by a stable ID.          |
| `Lesson`                 | `lessons`                   | A deck's Markdown lesson, identified by a stable ID.              |
| `StudySession`           | `study_sessions`            | One feed session with its position and lifecycle.                 |
| `FlashcardReviewAttempt` | `flashcard_review_attempts` | A provisional rating that can still change.                       |
| `ReviewEvent`            | `review_events`             | A finalized, durable rating.                                      |
| `FlashcardMemoryState`   | `flashcard_memory_states`   | The card's FSRS scheduling state.                                 |
| `FlashcardProgress`      | `flashcard_progress`        | Review counts and timestamps for summaries and resets.            |
| `DeckProgress`           | `deck_progress`             | A deck's saved learning data: `active`, `archived`, or `pending`. |

Deck packages own decks, cards, and lessons. The app owns everything else. Code uses
`Flashcard`; UI copy may say "card". Repositories access one table; queries that join tables
and transactions that write several are named for their use case.

### Study flow

1. Discover and Focus are two scopes of the same feed composer and learner state: all active
   decks, or one. They never become separate schedulers.
2. A session materializes a bounded window of cards. It tracks the current position and the
   furthest reviewed position, so going back never reopens finished work.
3. A rating creates a provisional attempt that affects the session immediately.
4. Finalization writes a `review_events` row, updates FSRS memory state, and aggregates
   progress. Skips record nothing.

FSRS is the memory model; the endless feed is the experience. Due dates never turn the feed into
a daily review queue.

### Content and learning data

Deck content and learning data have separate lifetimes. Removing a deck deletes its cards,
lessons, and audio but keeps its learning data under the stable deck and card IDs. See
[learning data](learning-data.md).

Every `.fcrdeck` is untrusted input. File import, QR transfer, and the bundled demo all go
through one validating installer. See [deck packages](deck-packages.md).

## Web portal

The portal reads decks from a private Cloudflare R2 bucket and never stores learning data.
`src/server` is server-only: environment, auth, storage, package reading, and transfer tokens.
QR transfer runs through an authenticated action, then a short-lived signed `/t/<token>`
route, then a short-lived R2 presigned download, so credentials never reach the browser or the
QR code. See [web portal](web-portal.md).

The portal uses Tailwind CSS because shadcn/ui ships through it. Product colors live in
`@flashcard-reels/design-tokens`, not in Tailwind.

## Tests

- `tests/unit`: pure, deterministic logic.
- `tests/integration`: real SQLite, filesystem, and application boundaries. The study system is
  never replaced by a large in-memory fake.
- `tests/architecture`: module boundaries and runtime-resource contracts.
- Maestro flows in `apps/mobile/.maestro` and the
  [manual checklist](manual-device-testing.md) cover gestures, native presentation, and release
  builds.
