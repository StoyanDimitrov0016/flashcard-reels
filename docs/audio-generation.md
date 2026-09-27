# Demo audio authoring

The built-in demo is self-contained under `apps/mobile/data/demo-deck`:

```text
data/demo-deck/
├── deck.json
└── audio/
    └── <card-id>.mp3
```

Each MP3 contains the spoken question, a short pause, and the answer. Set `audio: true` on its
card in `deck.json`. The playback control appears when the card is revealed. Cards without audio use
`audio: false` and have no MP3.

Generate and validate the runtime package from `apps/mobile`:

```powershell
npm.cmd run decks:packages
npm.cmd run decks:check
```

The generator validates the source against `@flashcard-reels/deck-contract` and writes the
`.fcrdeck` archive under `assets/decks`. The authoring directory is excluded from EAS uploads;
the generated package ships with the app.
