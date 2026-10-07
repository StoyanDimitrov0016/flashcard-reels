# Decks

A `.fcrdeck` is a ZIP archive. `@flashcard-reels/deck-contract` is the only authority on the format;
its [README](../../packages/deck-contract/README.md) documents the public API. This guide covers
the format, authoring, and publishing.

## Format (schema 4)

A source directory has exactly the same layout as its archive:

```text
deck.json
audio/<cardId>.mp3                  when card.audio is true
lessons/<lessonId>/intro.md         when lesson.intro is true
lessons/<lessonId>/<sectionId>.md   one per section
```

```jsonc
{
  "schema": 4,
  "id": "<deck UUID>",
  "authorId": "<author UUID>",
  "revision": 5,
  "title": "Example deck",
  "description": "Example description",
  "createdAt": "2026-10-05T00:00:00.000Z",
  "updatedAt": "2026-10-05T00:00:00.000Z",
  "cards": [
    {
      "id": "<card UUID>",
      "question": "When should a request time out?",
      "answer": "When its deadline expires.",
      "audio": true,
      "lessonId": "<lesson UUID>", // required, nullable
      "lessonSectionId": "<section UUID>", // required, nullable; needs lessonId
      "createdAt": "2026-10-05T00:00:00.000Z",
      "updatedAt": "2026-10-05T00:00:00.000Z",
    },
  ],
  "lessons": [
    {
      "id": "<lesson UUID>",
      "title": "Reliable requests",
      "intro": true,
      "sections": [{ "id": "<section UUID>", "title": "Timeouts" }],
    },
  ],
}
```

Rules:

- Array position is order. Objects reject unknown fields. Card, lesson, and section IDs are UUIDs
  that are unique across the deck.
- A section reference must resolve within the card's lesson. Several cards can share one.
- A lesson has an intro or at least one section, and at most 50 sections. A deck has 1–1,000 cards
  and at most 200 lessons.
- Every declared file exists and is non-empty after trimming; any other file rejects the package.
  Audio is one MP3 per card: the spoken question, an audible pause, and the spoken answer.
- Titles live only in `deck.json`, never as headings inside bodies.
- Limits: 64 MiB compressed, 128 MiB expanded, 8 MiB manifest, 5 MiB per audio file, and 256 KiB
  per text file. ZIP metadata is checked before decompression.

**Lesson Markdown** allows paragraphs, bulleted and numbered lists, fenced or indented code,
inline code, bold, italic, and line breaks. Headings, links, images, raw HTML, tables,
blockquotes, rules, strikethrough, task lists, and link definitions are rejected; `#` inside code
is fine. A lesson reads as one article: intro, then each section's title and body. A linked card
highlights only its section.

**Errors.** Invalid content produces one `DeckPackageParseError` listing every issue with its path,
plus the lesson, section, and line for Markdown. Any schema other than 4 produces
`UnsupportedDeckSchemaError`. Parsing finishes before any install write.

## Identity and revisions

These rules protect learning history (see [principles](../principles.md#product)).

- Raise `revision` whenever content changes. Importing the installed revision is a no-op, and an
  older revision is rejected.
- Keep deck, author, card, lesson, and section IDs stable. A card that teaches something
  substantially different gets a new ID.
- Renaming or moving a section within its lesson keeps its UUID. New or copied sections get new
  UUIDs. Moving a section to another lesson means updating the cards' `lessonId`. Deleting a
  referenced section means relinking or clearing those cards.
- Removed cards become inactive, and their history stays.

## Authoring

Curated decks live in R2. For local work, extract a package into `apps/mobile/data/decks/<name>/`,
which Git ignores along with generated packages and audio. A fresh checkout contains only the demo
(`data/demo-deck`) and test fixtures (`data/test-decks`).

From `apps/mobile`:

| Command                                            | Does                                                                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run decks:generate -- <src> <out>.fcrdeck`    | Builds one reproducible package (verified by parsing).                                                                                    |
| `npm run decks:inspect -- <file>.fcrdeck`          | Lists contents, section IDs, and linked-card counts. Installs nothing.                                                                    |
| `npm run decks:curated:prepare -- [<src> ...]`     | Builds every source (or `data/decks/*`), checks IDs across decks, and writes `build/curated-decks/` and root `flashcard-reels-decks.zip`. |
| `npm run decks:test:generate -- <deck.json> <out>` | Builds a fixture package, such as `data/test-decks/versioned/v1` and `v2`.                                                                |
| `npm run decks:packages` / `decks:check`           | Regenerates the bundled demo / checks it against the bundled registry.                                                                    |

The versioned test fixtures share one deck ID and show an unchanged, an edited, a removed, and a
new card, plus optional audio.

**The bundled demo** is built from `data/demo-deck` into `assets/decks`. Only the generated
package ships; the source directory is excluded from EAS uploads. On startup, the app installs the
demo only when it is missing or newer than the installed revision, and never reinstalls a demo the
learner removed. After changing the demo, run `decks:packages` and `decks:check`.

**Audio** is generated outside this repository with a local TTS service. Write one combined MP3 per
card to `audio/<cardId>.mp3` and set `audio: true` only once the file exists. Split
question/answer files are not valid assets. Decode and re-encode when joining clips, and never
concatenate raw MP3 bytes. Listen to a sample that includes technical terms and code before
publishing.

## Publishing

R2 has two catalogs: `dev/decks/` and `decks/` (production). From the repository root:

```bash
npm run r2:push-decks -- --environment=dev --dry-run
npm run r2:push-decks -- --environment=dev
```

The input defaults to `flashcard-reels-decks.zip`; package or source paths also work. The publisher
compares every candidate with its published version by decoded content (cards, lessons, sections,
metadata, and audio) and:

- **blocks** on changed content without a higher revision, a lower revision, a deck under a new
  key, or IDs shared across decks;
- **warns** on a removed card replaced by one with identical text, a new deck ID with a published
  title, or a section replaced by a same-title new UUID;
- skips unchanged decks, fails closed if R2 or a published package can't be read, and uploads only
  after the owner types `publish` in an interactive terminal. Agents never type it.
