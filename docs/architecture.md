# Architecture

## System

Flashcard Reels is an npm-workspaces Turborepo with four workspaces:

| Workspace                | Role                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `apps/mobile`            | Expo / React Native study client. SQLite + Drizzle, TanStack Query, FSRS.                                                |
| `apps/web`               | Internal Next.js App Router portal on Vercel. Reads curated decks from Cloudflare R2.                                    |
| `packages/deck-contract` | The `.fcrdeck` format: schemas, validation, reproducible archives, and package comparison. The only owner of the format. |
| `packages/design-tokens` | Framework-neutral colors as TypeScript objects (React Native) and CSS custom properties (web).                           |

Decks flow one way:

```text
deck source ──createDeckPackage──▶ .fcrdeck ──r2:push-decks──▶ R2 (dev/decks/ | decks/)
                                      │                           │
                                      │ file import               │ portal: byte-range reads,
                                      ▼                           ▼ signed QR transfer link
                         mobile deck installer ◀──────── presigned R2 download
                                      │
                                      ▼
                         SQLite content tables + app-owned audio files
```

Every arrow into the installer and the portal goes through `@flashcard-reels/deck-contract`.
The format itself is documented in the [decks guide](guides/decks.md).

## Mobile layers

Code lives in `apps/mobile/src`:

- `app/`: Expo Router routes. `app/_layout.tsx` is the composition root.
- `features/<feature>/`: `audio`, `decks`, `flashcards`, `flashcard-progress`, `learning-engine`,
  `lessons`, `preferences`, `progress-backup`, `reels`, and `study`. Each one is split into the
  layers below; `contracts/` holds feature-boundary schemas.
- `infrastructure/`: SQLite setup, the schema, app service composition, and recovery.
- `shared/`: feature-agnostic code. Feature-specific types belong in their feature.

Dependencies point inward:

| Source                      | May depend on                                                 | Must not depend on                                                           |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `domain`                    | Domain and framework-neutral shared code                      | Every other layer; React, React Native, Expo, SQLite, Drizzle                |
| `application`               | Application, domain, contracts, framework-neutral shared code | Infrastructure, presentation; React, React Native, Expo, SQLite, Drizzle     |
| `infrastructure`            | Infrastructure, application ports, domain, contracts          | Presentation                                                                 |
| `presentation/controllers`  | Application APIs, domain types, presentation, feature deps    | Infrastructure implementations, persistence packages                         |
| `presentation/dependencies` | `@/infrastructure/app-services` and application APIs          | Other infrastructure, persistence packages                                   |
| Other `presentation`        | Presentation and domain types                                 | Application APIs, infrastructure, the global container, persistence packages |
| `app/_layout.tsx`           | Everything needed to compose the app                          | —                                                                            |
| Other `app` routes          | Presentation APIs and domain types                            | Application APIs, infrastructure, the global container, persistence packages |

The mobile `.oxlintrc.json` enforces these rules for literal `@/` imports. It can't see relative
cross-layer imports or dynamic imports, so reviews catch those. Import feature code through an
explicit layer (`@/features/study/domain`), never a feature root. When you add a new root
infrastructure path, add it to the presentation restriction too: the regex engine has no negative
lookahead, so the allowed path can't be expressed as an exception.

**Composition.** Plain factory functions build repositories, transactions, gateways, and services;
`createAppServices` assembles them in dependency order. React providers only own their lifetime
and context. Screens read and write through TanStack Query (see
[conventions](conventions.md#data-access-with-tanstack-query)), local SQLite included.

## Data model

Deck packages own **content**. The app owns **learner data** and **session data**.

| Kind     | Tables                                                                                                                                      | Lifetime                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Content  | `decks`, `flashcards`, `lessons`, `lesson_sections`                                                                                         | Replaced on a higher revision; content rows cascade-delete with their deck.                                  |
| Learner  | `flashcard_review_events`, `flashcard_memory_states`, `flashcard_progress`, `deck_progress`, `deck_theme_selections`, `learner_preferences` | Keyed by stable IDs, **no foreign keys to content**. Survives deck removal.                                  |
| Session  | `study_sessions`, `study_session_reels`, `study_session_recurrences`, `flashcard_review_attempts`                                           | Bounded and compacted; cascades from its session.                                                            |
| Internal | `dismissed_bundled_decks`, `progress_backup_state`                                                                                          | Bundled decks the learner removed, so startup won't reinstall them; the safety copy from the latest restore. |

Key models:

- **`FlashcardReviewAttempt`**: a rating that can still change, because its card is among the last
  five reached. Committing it writes a **review event** (`flashcard_review_events`), updates
  **`FlashcardMemoryState`** (FSRS scheduling), and schedules any recurrence.
- **`FlashcardProgress`**: a stored aggregate of committed reviews for counts and reset
  boundaries. Reads project it together with rated attempts that haven't been aggregated yet,
  without persisting that projection. Keep stored progress, provisional attempts, and committed
  events distinct in names.
- **`DeckProgress`**: one row per studied deck, with status `active`, `archived`, or `pending`.
- **`StudySession`**: one feed (`discover` or `focus`) with its current and furthest reel
  positions. The furthest position only moves forward, and commit semantics depend on it.

Naming: persisted models and APIs say `Flashcard`; UI copy may say "card". Repositories access one
table. A read that joins models is a query type named for its result. An atomic write across
tables is a transaction type named for the operation. Application services coordinate them.

## Study engine

Discover and Focus share one feed composer in `learning-engine`. It orders cards by review history,
short-term recall pressure, new-card availability, and recent variety; Discover draws from every
active deck and Focus from one. Ratings affect the current session immediately. FSRS runs when a
review commits. Skips leave no history.

A session keeps a bounded window of materialized reels. It resumes at its saved position, and
moving backward never reopens committed reviews. Feed history beyond the window is compacted;
review history is not. Focus expires after five minutes in the background and resumes as a new
session. The engine's policies don't depend on React, navigation, SQLite setup, or deck storage.

## Learner data lifecycle

- **Remove a studied deck:** cards, lessons, audio, and session references are deleted, and
  `deck_progress` becomes `archived`. An unstudied deck leaves nothing behind. Pending attempts are
  committed and aggregation is drained first.
- **Reinstall an archived deck:** status becomes `pending`, and its cards stay out of the feeds
  until the learner chooses Continue (`active`) or Start fresh (learner rows deleted in one
  transaction).
- **Update a deck:** a higher revision replaces content. History for card IDs absent from the new
  revision is kept in case they return.
- **Reset** a card, a deck, or everything: deletes the matching review events, progress, and memory
  state. A deck reset also clears progress for its card IDs that aren't installed, so nothing hidden
  survives.
- **Archive size** shown in Decks is an estimate of learning rows plus a fixed per-row overhead.
  SQLite can't attribute shared pages to one deck.
- **One module owns deleting and keeping learner data.** Removal, resets, Start fresh, and archive
  deletion all go through it.

**Backups.** A backup is a JSON document with format `flashcard-reels-learner-data` and version
`1`. It contains `learnerPreferences`, `deckThemeSelections`, `deckProgress`,
`flashcardProgress`, `flashcardMemoryStates`, and `flashcardReviewEvents`. It excludes content,
audio, and sessions. Rows other than review events carry no database IDs, and restore generates
them. Timestamps are UTC ISO strings with milliseconds, because SQLite compares them as text.
Files are unencrypted.

- **Export** settles active sessions, commits attempts, drains all aggregation, reads every table
  in one transaction, and opens the share sheet.
- **Import** bounds the file's size, validates the whole document (versions, duplicate IDs,
  cross-deck ownership, and events that agree with their counts and dates), and shows a preview.
  On confirmation it settles sessions, saves a safety copy of current data to
  `progress-backups/`, and replaces learner data and all sessions in one transaction. Installed
  decks become `active`; absent decks become `archived`. Re-importing the same document is a no-op.
- Once a version is released, every later app must either read it or explain why it can't.

## Web portal

- `src/app` holds routes: `(auth)` for sign-in and `(portal)` for signed-in pages. `src/server` is
  server-only and holds environment, auth, deck storage and reading, and transfer tokens.
  `src/lib` and `src/hooks` must stay browser-safe.
- Pages read decks on the server. The deck library reads only the manifest and lesson text by byte
  range and never downloads audio for a preview.
- **Transfer chain:** an authenticated `POST /api/decks/<id>/transfer-link` creates a 10-minute
  signed `/t/<token>` URL. The public route verifies it and redirects to a short-lived R2 presigned
  URL. The phone downloads and installs normally. R2 credentials and long signatures never appear
  in the QR code.
- Shared-password sessions protect the catalog. Authorization checks stay next to sensitive server
  operations, even behind the proxy.
- Caching is per server instance and in memory. The [web portal guide](guides/web-portal.md) has
  the limits.
