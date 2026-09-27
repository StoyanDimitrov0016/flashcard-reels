# `.fcrdeck` deck packages

`.fcrdeck` is a ZIP archive validated by `@flashcard-reels/deck-contract`. It contains one
`deck.json` manifest and the assets named by that manifest:

```text
<deck-id>.fcrdeck
├── deck.json
├── audio/
│   └── <card-id>.mp3
└── lessons/
    └── <lesson-id>.md
```

The manifest uses `schema: 1` for the package format and a positive `revision` for the content
snapshot. It includes a stable deck UUID, an `authorId` UUID, timestamps, metadata, cards, and
lessons. A card has a stable ID, question, answer, `lessonId` (UUID or `null`), `audio` flag, and
timestamps. A lesson has a stable ID and title. **Array position determines card and lesson
order**; neither object has an `order` property.

Every card with `audio: true` requires exactly one `audio/<card-id>.mp3` file. That file contains
the spoken question, a short pause, and the spoken answer; its playback control is on the back of the card.
Cards with `audio: false` have no audio file. Every listed lesson requires a nonempty
`lessons/<lesson-id>.md` file. Extra files are rejected.

## Updating a deck

Raise `revision` whenever the content snapshot changes. Importing the installed revision is a
no-op; importing an older revision is rejected. A higher revision replaces the content while
keeping learning history for stable card IDs. Removed cards become inactive so their history is
retained. Use a new card ID when the learning content changes substantially.

Deleting a downloaded deck archives its learning data. Reinstalling the same deck ID pauses
study until the learner chooses to continue with saved progress or start fresh.

File imports and QR downloads feed the same mobile installer. The installer validates the full
package before changing SQLite or installed audio. The bundled demo is a generated package.

## Authoring and checking

Deck sources live under `apps/mobile/data/decks/<deck-name>/`, with `deck.json`, optional
`audio/<card-id>.mp3` files, and `lessons/<lesson-id>.md` files. The generator can also use
combined audio from `data/technical_flashcard_library/audio` for matching stable card IDs.

From `apps/mobile`:

```powershell
npm.cmd run decks:generate -- data/decks/system-design-foundations
npm.cmd run decks:inspect -- build/decks/<deck-id>.fcrdeck
npm.cmd run decks:packages
npm.cmd run decks:check
```

`decks:packages` regenerates the bundled demo; `decks:check` validates the runtime package
against the bundled registry. The web portal reads the same schema 1 manifest and checks the
archive's asset names with byte ranges, so listing and previewing decks do not download audio.
