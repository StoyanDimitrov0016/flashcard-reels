# Deck packages

`.fcrdeck` is the portable deck format: a ZIP archive with one `deck.json` manifest and the
assets it names. `@flashcard-reels/deck-contract` owns the format and is used by the app, the
portal, and the tooling.

```text
<deck-id>.fcrdeck
├── deck.json
├── audio/<card-id>.mp3
└── lessons/<lesson-id>.md
```

```json
{
  "schema": 1,
  "id": "stable-deck-uuid",
  "authorId": "stable-author-uuid",
  "revision": 1,
  "title": "Deck title",
  "description": "Deck description",
  "createdAt": "2026-09-28T10:00:00.000Z",
  "updatedAt": "2026-09-28T10:00:00.000Z",
  "cards": [
    {
      "id": "stable-card-uuid",
      "question": "Question",
      "answer": "Answer",
      "lessonId": "stable-lesson-uuid",
      "audio": true,
      "createdAt": "2026-09-28T10:00:00.000Z",
      "updatedAt": "2026-09-28T10:00:00.000Z"
    }
  ],
  "lessons": [{ "id": "stable-lesson-uuid", "title": "Lesson title" }]
}
```

- `schema` is the package format version; `revision` is the content snapshot.
- Array position sets card and lesson order. Neither has an `order` field.
- `lessonId` links a card to the lesson that explains it, or is `null`.
- A card with `audio: true` has exactly one `audio/<card-id>.mp3` that reads the question, a
  short pause, and the answer. A card with `audio: false` has no file.
- Every listed lesson has a non-empty `lessons/<lesson-id>.md`. Unlisted files are rejected.

## Limits

| Item             | Limit                               |
| ---------------- | ----------------------------------- |
| Cards            | 1 to 1,000                          |
| Lessons          | up to 200                           |
| Package          | 64 MiB compressed, 128 MiB expanded |
| `deck.json`      | 8 MiB                               |
| Each audio file  | 5 MiB                               |
| Each lesson file | 256 KiB                             |

The app and the portal enforce the same limits before expanding entries, and the installer
validates the whole package before changing SQLite or installed audio.

## Identity and revisions

- Deck, card, and lesson IDs are stable learning identities, and a card or lesson ID never
  appears in two decks. `authorId` never changes across revisions.
- Give a card a new ID when what it teaches changes substantially; otherwise its history
  carries over.
- Raise `revision` whenever content changes. The installed revision again is a no-op, a lower
  one is rejected, and a higher one replaces content while keeping history. Removed cards keep
  their history.

File import, QR transfer, and the bundled demo all use the same installer.

## Lessons

The reader supports headings, paragraphs, bold, italic, bulleted and numbered lists, inline
code, and fenced code blocks. Other syntax shows as plain text, links and images keep only their
text, and nothing loads from the network.

## Channels

Published decks live in one R2 bucket, split into two channels:

| Channel | R2 prefix    | Sources                      | Used for                                |
| ------- | ------------ | ---------------------------- | --------------------------------------- |
| prod    | `decks/`     | `apps/mobile/data/decks`     | Daily study                             |
| dev     | `dev/decks/` | `apps/mobile/data/dev-decks` | Testing features with three small decks |

The portal reads one channel, set by `DECK_CHANNEL`. The prod prefix never matches dev objects.
Dev decks are subsets of the prod decks with their own IDs, so both can be installed together.

## Authoring

Deck sources live in `apps/mobile/data/decks/<deck-name>/` and
`apps/mobile/data/dev-decks/<deck-name>/` with the package layout. Audio is generated with the
sibling `audiofier-tts` repository; the generator also takes combined audio from
`data/technical_flashcard_library/audio` for matching card IDs. From `apps/mobile`:

```powershell
npm.cmd run decks:generate -- data/decks/<deck-name>   # one package in build/decks
npm.cmd run decks:inspect -- build/decks/<deck-id>.fcrdeck
npm.cmd run decks:curated:prepare                     # every prod deck, checked together
npm.cmd run decks:dev:prepare                         # every dev deck, checked together
```

Each prepare command generates every source in its folder, validates each package, checks that
no deck, card, or lesson ID overlaps across decks, and writes a ZIP at the repository root:
`flashcard-reels-decks.zip` for prod and `flashcard-reels-dev-decks.zip` for dev. Packages and
ZIPs are ignored by Git.

The bundled demo lives in `data/demo-deck` and ships only as the generated package in
`assets/decks`. After changing it, run `decks:packages` and `decks:check`. On startup the app
installs the demo only when it is missing or older than the bundled revision.

`data/test-decks/versioned/v1` and `v2` share a deck ID for testing updates. Build them with
`decks:test:generate -- <deck.json> <output>`.

## Publishing

From the repository root, always naming the channel:

```powershell
npm run r2:push-decks -- --channel=dev --dry-run   # compare the dev ZIP with dev/decks/
npm run r2:push-decks -- --channel=dev             # upload after review
```

Without `--channel`, the publisher refuses to run. Without a path, it uses the channel's ZIP.
The publish check compares each package only with published decks in the same channel, and
reports added, changed, and removed cards and lessons. It blocks the whole publish when:

- content changed without a higher revision, or the revision went down;
- a published deck would move to another file name;
- the `authorId` changed;
- a card or lesson ID appears in more than one deck.

A removed card re-added with identical text produces a warning, because a new ID resets
progress. When R2 cannot be read, nothing uploads. Uploading requires typing `publish` in an
interactive terminal, so an agent can prepare a review but cannot confirm it.

The prod channel still holds packages in the earlier format, and the publisher stops on them.
Prod switches to schema 1 when `phase-0` merges (G6 in the
[functional requirements](functional-requirements.md)).
