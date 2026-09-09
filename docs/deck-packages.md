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

The package reader validates `deck.json`, duplicate IDs, contiguous orders, safe archive paths, and every audio filename/card reference before changing SQLite or the filesystem. Package generation and reading use the same Zod contract.

## Installation and updates

The Library screen selects a local `.fcrdeck` file through a feature-owned document-picker boundary. A new deck is inserted with active cards and an application-default appearance. Learner profiles are created later by the study flow, when a card is actually learned.

An already installed version is a no-op and does not stage audio. A lower version is rejected. A higher version is treated as the complete deck snapshot:

- matching IDs retain `createdAt`, learner state, and review history while their mutable content, `updatedAt`, `order`, and active state are updated;
- new IDs become active cards without a fabricated learner profile;
- missing IDs remain persisted but become inactive;
- a reappearing ID is reactivated with its existing history.

Audio is staged and fully activated before SQLite changes. Installed files use `deck-audio/<deck-id>/<deck-version>/`. If the database transaction fails, the newly activated version is removed and the previous version remains available. Successful updates remove obsolete audio versions; a cleanup failure may leave unused files but must not make installed database state point at missing audio.

Updating a deck completes its active focused session and the active mixed session. Installing a new deck completes the active mixed session. Unfinished review attempts are finalized using the normal session lifecycle; completed sessions and historical attempts remain untouched.

## Bundled decks

The checked-in technical source remains under `data/technical_flashcard_library`. The keyed registry in `src/infrastructure/bundled-deck-packages.ts` holds each bundled deck's ID, version, package asset, appearance, and cover asset. Database startup checks that metadata before reading the large archive, then uses the same importer as user-selected packages. Fresh bundled installation applies its local appearance and cover; package updates do not overwrite user-customized appearance.

Regenerate bundled packages with:

```powershell
npm.cmd run decks:packages
```
