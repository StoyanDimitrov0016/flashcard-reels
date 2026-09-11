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

Before decompression, the reader checks the archive limit and requires a bounded, single-disk ZIP central directory with consistent entry/local-header offsets and declared compressed/uncompressed sizes. Malformed metadata, encrypted/unsupported entries, multi-disk archives, and ZIP64 are rejected rather than passed to decompression. Post-read size and contract validation remains a second layer. Every failure occurs before audio staging, filesystem activation, or SQLite mutation and reports a `DeckPackageValidationError`.

## Installation and updates

The Library screen's Import action selects a local `.fcrdeck` file through a feature-owned document-picker boundary. Select a package from Android Downloads (or another device location), then use the import feedback to confirm whether it was installed, updated, or already current. A new deck is inserted with active cards and an application-default appearance. Learner profiles are created later by the study flow, when a card is actually learned.

An already installed version is a no-op and performs no audio staging/activation, permanent filesystem writes, SQLite mutation, or study-session invalidation. A lower version is rejected. A higher version is treated as the complete deck snapshot. Imports are serialized in process per deck ID, so a waiting import rechecks the installed version after the preceding import completes; different deck IDs are not serialized with each other.

A higher version is treated as the complete deck snapshot:

- matching IDs retain `createdAt`, learner state, and review history while their mutable content, `updatedAt`, `order`, and active state are updated;
- new IDs become active cards without a fabricated learner profile;
- missing IDs remain persisted but become inactive;
- a reappearing ID is reactivated with its existing history.

Audio is staged and fully activated before SQLite changes. Installed files use `deck-audio/<deck-id>/<deck-version>/<card-id>.<side>.mp3`. Lookup always requires the deck ID, exact installed version, card ID, and side; it never scans other directories. If the database transaction fails, the newly activated version is removed and the previous version remains available. Successful updates remove obsolete audio versions; a cleanup failure may leave unused files but must not roll back the successful database install or make installed database state point at missing audio. The consistency preference is orphaned files over missing referenced files.

Updating a deck completes its active focused session and the active mixed session. Installing a new deck completes the active mixed session. Unfinished review attempts are finalized using the normal session lifecycle; completed sessions and historical attempts remain untouched.

## Demo and external packages

The self-contained authoring document and two source audio files live under `data/demo-deck`; they are excluded from EAS build uploads. `assets/decks` contains only one small six-card/two-audio demo package. External import is the normal distribution path for larger decks. Installed runtime state lives in SQLite plus application-owned `deck-audio/<deck-id>/<version>` storage.

The keyed registry in `src/infrastructure/bundled-deck-packages.ts` holds the demo ID, version, package asset, curated appearance preset ID, and cover asset. Database startup reads it only when no version is installed or the bundled version is newer. Equal versions and newer local versions skip the archive entirely. Fresh bootstrap applies its local preset and cover; updates do not overwrite user-customized appearance.

Regenerate and validate the demo package with:

```powershell
npm.cmd run decks:packages
npm.cmd run decks:check
```

`bundled-deck-registry.json` is the machine-readable source of truth consumed by runtime, tests, and `decks:check`; no source-code regex parsing is used. Runtime verification reads only registry metadata and runtime assets, not authoring data, and runs before Android export.

Installation is owned by `src/features/decks/deck-installer`. Its public surface contains one operation, `installFromFile`, plus the install result and typed validation/version errors; bundled byte installation is internal. Archive parsing, resource limits, per-deck serialization, audio staging/activation/cleanup, SQLite snapshot updates, learner-history preservation, and study-session invalidation stay behind that boundary.

Lifecycle changes require deterministic coverage at the appropriate level: pure schema/path/limit rules in unit tests, SQLite and real package/archive behavior in integration tests, and install-study-update-remove-reactivate/session/audio invariants in scenario tests. Invalid-package scenarios must prove both SQLite and permanent audio state remain unchanged.

## Local inspection and test packages

Inspect any package without installing it:

```powershell
npm.cmd run decks:inspect -- path/to/deck.fcrdeck
```

The command reports the path, deck metadata, card/audio counts, package size, and validation result. Invalid input exits non-zero with a concise reason.

For quick version testing, edit the small fixtures under `data/test-decks/versioned` and generate normal packages:

```powershell
npm.cmd run decks:test:generate -- data/test-decks/versioned/v1/deck.json tmp/v1.fcrdeck
npm.cmd run decks:test:generate -- data/test-decks/versioned/v2/deck.json tmp/v2.fcrdeck
```

Fixture card-array order becomes package order. Each card may specify `questionAudio` or `answerAudio` as a local path relative to its fixture file. The generator validates the canonical document and writes the same `.fcrdeck` format used by the app. It is intentionally limited to generating one package from one fixture.
