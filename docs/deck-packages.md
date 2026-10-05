# `.fcrdeck` deck packages

`.fcrdeck` is a ZIP archive validated by `@flashcard-reels/deck-contract`. Readers accept
**schema 4 only**. Other numeric schemas produce `UnsupportedDeckSchemaError`; there is no
legacy reader or Markdown section migration command.

## Manifest and files

A source directory has exactly the same layout as its archive:

```text
deck.json
audio/<cardId>.mp3                       when card.audio is true
lessons/<lessonId>/intro.md              when lesson.intro is true
lessons/<lessonId>/<sectionId>.md        one body per section
```

The manifest contains a stable deck UUID, `authorId` UUID, positive `revision`, title,
description, timestamps, cards, and lessons. Array position determines card, lesson, and section
order; none has an `order` property. Objects reject unknown fields.

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
      "lessonId": "<lesson UUID>",
      "lessonSectionId": "<section UUID>",
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

Both `lessonId` and `lessonSectionId` are required nullable UUID fields. A section reference
requires a lesson reference and must resolve within that lesson. Several cards can share a
destination. Card, lesson, and section IDs must be unique across the deck. A lesson needs an
intro or at least one section; it can have at most 50 sections. A deck has 1–1,000 cards and
at most 200 lessons.

Sections are flat entities. Keep a section UUID when renaming or moving it within a lesson;
new or copied sections get new UUIDs. Moving a section to another lesson requires updating the
cards' `lessonId`. Deleting a referenced section requires deliberately relinking or clearing
card destinations. Titles live only in the manifest, never as headings or markers in bodies.

Every declared file must exist and be nonempty; text must remain nonempty after trimming.
Every other file rejects the package. Audio contains the spoken question, a pause, and the spoken
answer, and is absent when `audio` is false.

## Lesson Markdown and validation

Intro and section files contain UTF-8 Markdown bodies. Allowed elements are paragraphs,
bulleted and numbered lists, fenced or indented code, inline code, bold, italic, and line breaks.
Headings, links, images, raw HTML, tables, blockquotes, horizontal rules, strikethrough,
task lists, and link definitions are rejected. Heading characters inside code are ordinary code.

The contract validates every block and inline token with the same `marked` version used by
the mobile `react-native-marked` renderer. The web keeps `react-markdown`; both readers receive
validated bodies. Lessons read continuously: optional intro, then each section heading and body.
A linked card highlights only its section.

Invalid manifests, files, relationships, or Markdown produce one `DeckPackageParseError` with
all applicable issues. Each issue has a path; Markdown issues also identify the lesson, section
or intro, and one-based line within that file. Full parsing completes before any installation
write. Numeric unsupported schemas produce the distinct `DECK_SCHEMA_UNSUPPORTED` code.

Limits are 64 MiB compressed and 128 MiB expanded; the manifest limit is 8 MiB, each audio file
5 MiB, and each intro or section text file 256 KiB. ZIP metadata is checked before decompression.
The portal reads entries by byte range without downloading audio for previews.

## Updating a deck

Raise `revision` whenever the content snapshot changes. Importing the installed revision is a
no-op; an older revision is rejected. A higher revision replaces content while keeping learner
history for stable card IDs. Removed cards become inactive so their history remains. Keep the
deck's `authorId` stable. Use a new card ID when the learning content changes substantially.

Deleting a downloaded deck archives its learning data. Reinstalling the same deck ID pauses
study until the learner chooses saved progress or a fresh start. File imports and QR downloads
use the same installer. The bundled demo is generated from its versioned schema 4 source and
updates automatically to revision 4 unless previously removed.

Mobile uses the fresh `flashcard-reels-v8.db` development database and one generated `0000`
baseline. Older databases remain separate. To recover v7 progress, export a progress backup on
the v7 build, install the same decks on v8, and restore the backup keyed by card ID. Phone
positioning, performance, and the v7-to-v8 restore remain owner acceptance checks.

## Authoring and checking

Curated packages in R2 are their source of record. Extract a schema 4 package into
`apps/mobile/data/decks/<name>/` for local work. Curated sources, audio, generated packages,
and aggregate ZIPs stay ignored by Git; a fresh checkout includes only the demo and test fixtures.
Generators read directory file maps through `parseDeckFiles` and write reproducible archives with
`createDeckPackage`, which verifies them by parsing.

From `apps/mobile`:

```powershell
npm.cmd run decks:generate -- data/decks/<name> build/<deck-id>.fcrdeck
npm.cmd run decks:inspect -- build/<deck-id>.fcrdeck
npm.cmd run decks:curated:prepare -- data/decks/<name> data/decks/<another-name>
npm.cmd run decks:packages
npm.cmd run decks:check
```

`decks:curated:prepare` accepts explicit sources or, without arguments, every directory in
`data/decks`. All selected sources must be schema 4; exclude predecessor copies. It checks
identities across decks, writes packages to `build/curated-decks`, and creates
`flashcard-reels-decks.zip` at the repository root. The inspector lists section IDs, titles,
and linked-card counts. `decks:packages` regenerates the bundled demo; `decks:check` validates
its runtime package against the bundled registry.

## Development and production publication

Development uses `dev/decks/`; production uses `decks/`. The publisher requires an explicit
environment and compares only that catalog. Web `DECK_PREFIX` is required: use `dev/decks/`
locally and for Preview, and `decks/` for Production. There is no default.

After a catalog contains schema 4 packages, review and upload from the repository root:

```powershell
npm run r2:push-decks -- --environment=dev --dry-run
npm run r2:push-decks -- --environment=dev
```

The default input is `flashcard-reels-decks.zip`; explicit package or source-directory paths
are also accepted. Uploading requires typing `publish` in an interactive terminal. Stable deck
IDs preserve existing R2 object keys. Comparisons include cards, lesson intro, section identity,
order, title, body, metadata, and audio. Replacing a section with a same-title new UUID produces
a warning to keep the original ID so links remain attached.

**The schema 3 catalog needs an owner-controlled format cutover first.** The exclusive schema 4
publisher cannot compare legacy packages. Keep predecessor backups, verify preserved card and
section IDs and unchanged audio, then replace packages at their existing keys with schema 4
versions. The seven converted revision 5 packages are in `apps/mobile/build/` in the implementation
worktree; predecessor snapshots are in `build/schema-3/`. These artifacts are local, not committed.
Spec 7 implementation performs no R2 publication. Production cutover and an updated APK are
owner release steps.
