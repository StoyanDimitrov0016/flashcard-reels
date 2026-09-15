# `.fcrdeck` deck packages

`.fcrdeck` is Flashcard Reels’ portable deck format. It is a ZIP-compatible archive with one canonical `deck.json` document and optional audio files:

```text
<deck-id>.fcrdeck
├── deck.json
└── audio/
    └── <card-id>.<side>.mp3
```

The document contains stable deck/card IDs, a positive package version, metadata, and an ordered card snapshot:

```json
{
  "id": "stable-deck-uuid",
  "version": 1,
  "title": "Deck title",
  "description": "Deck description",
  "cards": [{ "id": "stable-card-uuid", "order": 0, "question": "Question", "answer": "Answer" }]
}
```

Audio is optional and may be provided as `audio/<card-id>.answer.mp3` or `audio/<card-id>.question.mp3`. The mobile installer validates the archive before changing local data and rejects malformed, unsafe, or oversized packages.

## Updates

Increment the deck version whenever the complete content snapshot changes. Re-importing the current version is a no-op; older versions are rejected. New versions update content while preserving stable-card learning history, and removed cards become inactive rather than losing their historical records.

Local-file imports and web QR transfers use the same installer, audio storage, and update behavior. The bundled demo is one generated package; larger libraries are external imports.

## Tooling

```powershell
npm.cmd run decks:inspect -- path/to/deck.fcrdeck
npm.cmd run decks:packages
npm.cmd run decks:check
```

The inspector validates a package without installing it. The package and check commands regenerate and verify the bundled demo assets.
