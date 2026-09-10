# `.fcrdeck` deck packages

Flashcard Reels uses `.fcrdeck` as a portable local deck format. It is a ZIP-compatible archive and is independent of the app's SQLite schema.

## Structure

```text
<deck-id>.fcrdeck
├── deck.json
└── audio/
```

`deck.json` is the single canonical package document:

```json
{
  "id": "stable-deck-uuid",
  "version": 1,
  "title": "Deck title",
  "description": "Deck description",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "cards": [
    {
      "id": "stable-card-uuid",
      "order": 0,
      "question": "Question",
      "answer": "Answer",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

The deck ID is stable. Increment `version` whenever the deck metadata or complete card snapshot changes. Card orders must be contiguous integers from `0` through `cards.length - 1`; card IDs are stable and identify content across updates. Card records do not repeat `deckId` because the enclosing document owns them.

Audio is optional and is inferred from archive entries. Supported files are:

```text
audio/<card-id>.answer.mp3
audio/<card-id>.question.mp3
```

The package reader validates `deck.json`, duplicate IDs, contiguous orders, safe archive paths, and every audio filename/card reference before changing SQLite or the filesystem. Package generation and reading use the same Zod contract. It also rejects packages above these resource ceilings:

- 64 MiB compressed archive size;
- 128 MiB total uncompressed size;
- 1,000 cards;
- 5 MiB per audio file;
- 2,000 audio files.

Compressed size is checked before decompression. All other checks still happen before audio staging, filesystem activation, or SQLite mutation and report a `DeckPackageValidationError`.

## Installation and updates

The Library screen selects a local `.fcrdeck` file through a feature-owned document-picker boundary. A new deck is inserted with active cards and an application-default appearance. Learner profiles are created later by the study flow, when a card is actually learned.

An already installed version is a no-op and performs no audio staging/activation, permanent filesystem writes, SQLite mutation, or study-session invalidation. A lower version is rejected. A higher version is treated as the complete deck snapshot. Imports are serialized in process per deck ID, so a waiting import rechecks the installed version after the preceding import completes; different deck IDs are not serialized with each other.

A higher version is treated as the complete deck snapshot:

- matching IDs retain `createdAt`, learner state, and review history while their mutable content, `updatedAt`, `order`, and active state are updated;
- new IDs become active cards without a fabricated learner profile;
- missing IDs remain persisted but become inactive;
- a reappearing ID is reactivated with its existing history.

Audio is staged and fully activated before SQLite changes. Installed files use `deck-audio/<deck-id>/<deck-version>/<card-id>.<side>.mp3`. Lookup always requires the deck ID, exact installed version, card ID, and side; it never scans other directories. If the database transaction fails, the newly activated version is removed and the previous version remains available. Successful updates remove obsolete audio versions; a cleanup failure may leave unused files but must not roll back the successful database install or make installed database state point at missing audio. The consistency preference is orphaned files over missing referenced files.

Updating a deck completes its active focused session and the active mixed session. Installing a new deck completes the active mixed session. Unfinished review attempts are finalized using the normal session lifecycle; completed sessions and historical attempts remain untouched.

## Bundled decks

The checked-in authoring JSON and raw source audio live under `data/technical_flashcard_library`; they are excluded from EAS build uploads. Generated distribution archives live under `assets/decks` and remain Metro/Expo runtime assets. Installed runtime state lives in SQLite plus application-owned `deck-audio/<deck-id>/<version>` storage.

The keyed registry in `src/infrastructure/bundled-deck-packages.ts` holds each bundled deck's ID, version, package asset, appearance, and cover asset. Database startup reads an archive only when no version is installed or the bundled version is newer. Equal versions and newer local versions skip the archive entirely. Fresh bundled installation applies its local appearance and cover; package updates do not overwrite user-customized appearance. An integration test opens every generated archive and verifies that its ID and version match the cheap registry metadata.

Regenerate bundled packages with:

```powershell
npm.cmd run decks:packages
npm.cmd run decks:check
```

`decks:check` is also run before the Android export path so builds fail clearly when a referenced generated package is missing.

Lifecycle changes require deterministic coverage at the appropriate level: pure schema/path/limit rules in unit tests, SQLite and real package/archive behavior in integration tests, and install-study-update-remove-reactivate/session/audio invariants in scenario tests. Invalid-package scenarios must prove both SQLite and permanent audio state remain unchanged.
