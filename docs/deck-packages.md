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

Increment the deck version whenever the complete content snapshot changes. Re-importing the current version is a no-op; older versions are rejected. New versions update content while preserving stable-card learning history, and removed cards become inactive rather than losing their historical records. Assign a new card ID when a revision changes what the card teaches substantially.

Deleting a downloaded deck archives its learning data separately. Reinstalling the same deck ID pauses it until the learner chooses to continue with saved progress or permanently delete that progress and start fresh.

Local-file imports and web QR transfers use the same installer, audio storage, and update behavior. The bundled demo is one generated package; larger libraries are external imports.

## Tooling

```powershell
npm.cmd run decks:inspect -- path/to/deck.fcrdeck
npm.cmd run decks:packages
npm.cmd run decks:check
```

The inspector validates a package without installing it. The package and check commands regenerate and verify the bundled demo assets.

## Publishing

```powershell
npm.cmd run r2:push-decks -- --dry-run path/to/deck.fcrdeck
npm.cmd run r2:push-decks -- path/to/deck.fcrdeck
```

The command accepts `.fcrdeck` files or a ZIP of them, and defaults to `flashcard-reels-decks.zip`.
Before uploading, it compares each package with the published deck that has the same ID and
reports added, changed, and removed cards. It blocks the whole publish when content changed
without a higher version, a version went down, a published deck moved to another file name, or a
card ID appears in more than one deck. Cards removed and re-added with identical text produce a
warning, because a new ID resets learner progress. Cross-deck checks cover the packages being
published and the published versions they replace.

Uploading requires typing `publish` in an interactive terminal after reading the report, so an
agent can prepare and show a review but cannot confirm it. When R2 cannot be read, nothing is
uploaded. See the [publish check spec](specs/0-deck-publish-check.md).
