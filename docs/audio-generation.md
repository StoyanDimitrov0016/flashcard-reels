# Demo audio authoring

The built-in demo is fully self-contained under `data/demo-deck`:

```text
data/demo-deck/
├── deck.json
└── audio/
    ├── <card-id>.answer.mp3
    └── <card-id>.answer.mp3
```

To change the demo, edit its canonical `deck.json` and replace its MP3 files. Audio names follow
the normal `<card-id>.<side>.mp3` package contract and must reference cards in the document.

Generate and validate the runtime package with:

```powershell
npm.cmd run decks:packages
npm.cmd run decks:check
```

The generator validates the source document with the installer-owned schema and writes the normal
`.fcrdeck` archive under `assets/decks`. The authoring directory is excluded from EAS uploads;
only the generated demo package ships. External packages use the same installer and versioned
application-owned audio storage.
