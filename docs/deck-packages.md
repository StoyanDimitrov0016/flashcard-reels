# `.fcrdeck` deck packages

Flashcard Reels uses `.fcrdeck` as a portable local deck format. It is a ZIP-compatible archive and is independent of the app's SQLite schema.

## Structure

```text
manifest.json
cards.json
audio/
```

`manifest.json` contains:

```json
{
  "id": "stable-deck-uuid",
  "version": 1,
  "title": "Deck title",
  "description": "Deck description",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

The deck ID is a stable UUID. Increment `version` whenever the deck metadata or card snapshot changes. Keep the same ID when publishing an update.

Each entry in `cards.json` contains the stable flashcard ID, the owning deck ID, question, answer, ISO timestamps, and `position`. Optional `questionAudio` and `answerAudio` values are relative paths beginning with `audio/`.

```json
{
  "id": "stable-card-uuid",
  "deckId": "stable-deck-uuid",
  "question": "Question",
  "answer": "Answer",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "position": 0,
  "answerAudio": "audio/stable-card-uuid.mp3"
}
```

The package reader validates the complete archive before changing SQLite or audio state. It rejects malformed JSON or records, invalid UUIDs/timestamps/versions, duplicate card IDs or positions, missing audio references, unexpected entries, and unsafe archive paths.

## Installation and updates

The Library screen selects a local `.fcrdeck` file through the system document picker. A new deck is inserted with active cards and fresh learner profiles. Existing deck appearance is never overwritten; a new deck receives the application default appearance.

Importing the same version is a no-op. A lower version is rejected. A higher version is treated as the complete deck snapshot:

- matching card IDs receive new content and positions while retaining `createdAt`, learner state, and review history;
- new IDs become active cards with the normal new-card learner state;
- missing IDs remain persisted but become inactive;
- a card that returns with its original ID is reactivated with its existing history.

Active study sessions affected by an update are completed so the next study entry prepares from current active content. Completed sessions and review history remain available for aggregation and reporting.

Audio is copied from the archive into application-owned per-deck storage. Playback resolves the installed copy by flashcard identity; it does not depend on the package's temporary extraction location or on whether the deck was bundled with the app.

Learner profiles, review attempts, session items, and recurrences are application state, not package content. Stable deck and flashcard IDs are the link that lets content updates preserve that state.

## Technical decks

The checked-in technical source remains under `data/technical_flashcard_library`. Regenerate bundled packages with:

```powershell
npm.cmd run decks:packages
```

The resulting archives in `assets/decks` are installed at startup through the same importer used by local packages.
