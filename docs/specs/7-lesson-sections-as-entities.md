# 7 - Lesson sections as entities

Status: ready for implementation after the owner signs off "Hard-to-reverse decisions" and
completes Part 0. Supersedes the section representation in
[4 - Lesson section references](4-lesson-section-references.md) and the comment markers recorded in
[the stable section identities review](../reviews/2026-10-05-stable-section-identities.md).
Scope: `packages/deck-contract`, deck sources and tooling, and `apps/mobile`. `apps/web` receives
only the changes it needs to keep reading packages.

## Problem and value

A card can open its lesson at a related section. Today a section is not an entity. It exists
because of `#` characters in Markdown, and every reader parses it again on every lesson open.
Branch `feat/stable-sections-and-dev-catalog` made section identity stable by writing
`<!-- section: <uuid> -->` comments into lesson Markdown. That works, but it puts machine data into
prose, makes the reading parser the authority on structure, and cannot be produced naturally by a
future editor.

This spec makes a section a first-class entity, like a lesson or a card: its ID, title, and order
live in `deck.json`, and its body is a Markdown file of its own. No code infers identity or
boundaries from Markdown. The same pass removes the other weaknesses found in the deck format:

1. **Lazy, scattered validation.** `lessonSectionId` is an optional `z.string().max(512)`, and
   whether it resolves is checked later, in a separate function that callers must remember to call
   (`readDeckAssets`, and separately the web portal's `deck-package.ts`). The web portal also
   re-implements the expected archive file list.
2. **Three package schemas read at once.** Schema 1, 2 (heading-path IDs) and 3 (comment markers)
   all stay alive in the parser, although Phase 0 has no released users to protect.
3. **A hand-written Markdown parser and renderer.** About 520 lines
   (`deck-contract/src/lessons/lesson-markdown.ts`, `lesson-markdown-view.tsx`) re-implement
   standard Markdown parsing.
4. **The lesson title is stored twice.** It is in `deck.json` and again as an opening `# Title`,
   reconciled by the `withoutRepeatedTitle` heuristic in the contract and again in
   `apps/web/src/lib/lesson-text.ts`.
5. **Format knowledge outside the format owner.** The package writer and the publication
   comparison live in mobile internals (`contract-deck-package-writer.ts`,
   `deck-package-publication.ts`), and `scripts/push-decks-to-r2.mjs` imports from
   `apps/mobile/src/.../internal/`. Archive paths are known in three places.
6. **A silent production default.** The web portal's `DECK_PREFIX` defaults to `decks/`, so a
   missing variable quietly selects the production catalog.
7. **Untyped content errors.** Some contract paths throw plain `Error` for content problems.

Deck Studio is out of scope. The format below is what an editor would produce: it creates a
section with a new UUID and never has to parse text to find one.

## How to use this spec

Every fact below was checked against `feat/stable-sections-and-dev-catalog` at commit `7ab2b14`.
Line numbers drift; find code by the file and function named.

Design rules for every part:

- **Deep modules.** A module exposes a small interface and hides its decisions. Callers never
  build archive paths, never join manifest entries to file contents, and never call a validation
  step separately.
- **One owner per decision.** The deck contract owns the format, the paths, and every content
  rule. Mobile owns storage and presentation. Scripts own file system access.
- **Validate at the boundary, then trust.** Content is fully validated when parsed. Code that
  receives a parsed `Deck` does not re-check it and does not add fallbacks for invalid content.
- **Expected failures are typed and complete.** Invalid content produces one typed error listing
  every issue with its path. Programming errors throw normally and are not caught.
- **No compatibility code.** Readers accept schema 4 only.

**Stop and report only when:**

1. converted content fails the allowed Markdown subset or the converter's self-checks. Report the
   lessons and lines; do not widen the subset or edit lessons;
2. a library API named here does not exist in the installed version, or `react-native-marked`
   cannot run under the mobile Jest setup without mocking it entirely;
3. doing an item as written would change learner-visible behavior not listed in this spec;
4. `npm ls marked` shows more than one `marked` version after Part 2.

Otherwise make the decision that best follows the design rules, and record it in the commit body.

Do not publish anything to R2 and do not pass `--environment=prod` to any script.

## Hard-to-reverse decisions (owner signs off)

1. **Flat sections.** A lesson is an optional intro plus an ordered, flat list of sections.
   Existing level 3 and 4 headings become ordinary sections and keep their UUIDs. Nesting can be
   added later as a new schema with an optional `parentId`, without changing any ID.
2. **Package schema 4, read exclusively.** There are no users to keep compatible with, so no older
   schema is read. The number still moves forward: the owner's installed APK and `dev/decks/` hold
   packages numbered 1–3, and a new number makes every older reader reject the new format cleanly
   instead of misreading it. Readers reject schemas 1–3 with a distinct, typed error.
3. **Package layout** as defined under "Package format".
4. **Allowed Markdown subset**: paragraphs, bulleted and numbered lists, fenced or indented code,
   inline code, bold, italic, and line breaks. Headings, links, images, raw HTML, tables,
   blockquotes, horizontal rules, and strikethrough are rejected. Current content uses no rejected
   element outside code.
5. **`marked` parses, `react-native-marked` renders.** The contract validates with the same
   parser the phone renders with.
6. **No stored combined `lesson.md`.** A second copy of the content in the package would need its
   own equality check and becomes a second source of truth. A combined export can be computed from
   the sections when a consumer exists.
7. **Development database `flashcard-reels-v8.db`.** Same Phase 0 policy as specs 5 and 6: rename,
   regenerate the `0000` baseline, no migration. Progress returns through backup restore, which is
   keyed by card ID.
8. **Curated decks live in R2, not Git.** Their packages in R2 are their only source of record;
   Git holds the demo deck and test fixtures only. Curated decks are therefore converted package
   to package (Parts 0, 1, and 3), and `/apps/mobile/data/decks/` stays ignored.

## Package format

### `deck.json`

```jsonc
{
  "schema": 4,
  "id": "uuid", "authorId": "uuid", "revision": 5,
  "title": "…", "description": "…", "createdAt": "…", "updatedAt": "…",
  "cards": [{
    "id": "uuid", "question": "…", "answer": "…", "audio": true,
    "lessonId": "uuid" | null,
    "lessonSectionId": "uuid" | null,      // required key, UUID or null
    "createdAt": "…", "updatedAt": "…"
  }],
  "lessons": [{
    "id": "uuid",
    "title": "Reliable requests",            // plain text, the only copy of the title
    "intro": true,                          // whether lessons/<lessonId>/intro.md exists
    "sections": [
      { "id": "uuid", "title": "Timeouts" }  // plain text, reading order
    ]
  }]
}
```

`intro: boolean` follows the existing `audio: boolean` pattern: the manifest declares every file.

### Archive files

```text
deck.json
audio/<cardId>.mp3                    when card.audio
lessons/<lessonId>/intro.md           when lesson.intro
lessons/<lessonId>/<sectionId>.md     one per section, body only
```

A deck source directory uses exactly the same layout, so an archive is a ZIP of its source
directory. Every listed file must exist and be non-empty after trimming; any other file rejects
the package (existing rule).

### Validation rules

All rules run inside the contract's parse functions. All issues of one package are collected and
thrown together as one `DeckPackageParseError`.

- `schema` must be `4`. A readable `schema` number other than 4 throws `UnsupportedDeckSchemaError`
  (see "Errors") before any other check.
- Zod schema (strict objects): IDs are UUIDs; titles have at least one character; a lesson has
  at most `maxSectionsPerLesson` (50) sections; `lessonSectionId` is a required, nullable UUID.
- Relationships: card, lesson, and section IDs are unique across the whole deck; a lesson has
  an intro or at least one section; a non-null `lessonSectionId` requires a non-null `lessonId`
  and names a section of that lesson.
- Bodies (intro and sections): parsed with `marked`'s lexer (GFM on); every block and inline token
  must belong to the allowed subset. An issue names the lesson, the section or intro, and the line
  of the offending block within that file. Intro and section files use the existing per-file byte
  limit (rename `maxLessonFileBytes` to `maxLessonTextFileBytes`).

## Deck contract design

### Public interface

The entry point stays `packages/deck-contract/src/index.ts`. After this spec it exports only:

```ts
// Types
type DeckManifest   // deck.json as validated (lessons carry intro: boolean, sections without bodies)
type Deck           // resolved content: lessons carry intro: string | null and sections with body
type Lesson         // { id, title, intro: string | null, sections: readonly LessonSection[] }
type LessonSection  // { id, title, body }
type Flashcard
type DeckPackage    // { deck: Deck; audio: ReadonlyMap<string, Uint8Array> } (keyed by card ID)

// Reading
parseDeckPackage(bytes: Uint8Array): DeckPackage
parseDeckFiles(files: Readonly<Record<string, Uint8Array>>): DeckPackage   // a source directory or unzipped archive
parseDeckManifest(bytes: Uint8Array): DeckManifest                         // listing without content
readDeckContent(manifest: DeckManifest, readText: (path: string) => string | undefined): Deck
deckPackagePaths(manifest: DeckManifest): ReadonlySet<string>              // every archive path, including deck.json

// Writing
createDeckPackage(deckPackage: DeckPackage): Uint8Array                    // reproducible ZIP, verified by parseDeckPackage

// Publishing
compareDeckPackages(published: DeckPackage, candidate: DeckPackage): DeckComparison
type DeckComparison

// Constants and errors
DECK_PACKAGE_LIMITS, DECK_SCHEMA_CONSTRAINTS, DECK_SCHEMA_VERSION
DeckContractError, DeckPackageParseError, UnsupportedDeckSchemaError
type DeckPackageParseIssue, DeckContractErrorCode, DeckContractErrorContext
```

- `parseDeckPackage` = unzip (existing limits) + `parseDeckFiles`.
- `parseDeckFiles` = `parseDeckManifest` + exact file set check against `deckPackagePaths` +
  `readDeckContent` + audio.
- `readDeckContent` is the single place that validates bodies and section references. The web
  portal uses it with lesson texts it read through its range reader, so it never downloads audio.
- `parseDeck`, `validateLessonReferences`, `parseLessonMarkdown`, `parseLessonDocument`,
  `withoutRepeatedTitle`, `assignLessonSectionIds`, `LessonMarkdownParseError`, `LessonBlock`, and
  `LessonInline` are removed. If a caller still needs one, the interface above is missing a
  capability: extend the interface rather than re-export internals.

### Internal modules

```text
src/
  deck.constants.ts         schema version 4, constraints, package limits
  deck.schemas.ts           Zod manifest schema (schema 4 only)
  deck.types.ts             DeckManifest, Deck, Lesson, LessonSection, Flashcard, DeckPackage
  errors/                   DeckContractError, DeckPackageParseError, UnsupportedDeckSchemaError, issues
  manifest/                 parse-deck-manifest.ts, validate-manifest-relationships.ts
  content/                  read-deck-content.ts, validate-lesson-text.ts (marked lexer, allowed subset)
  package/                  deck-package-paths.ts, extract-deck-archive.ts, parse-deck-files.ts,
                            parse-deck-package.ts, create-deck-package.ts, validate-zip-metadata.ts
  publication/              compare-deck-packages.ts
```

Archive paths are built only in `deck-package-paths.ts`. `fflate` stays the archive library.
Add `marked` as a contract dependency at the version `react-native-marked` resolves to.

### Errors

| Situation | Error | Code | Context |
|---|---|---|---|
| Not a ZIP, limits exceeded, missing or extra files, malformed JSON, schema violations, broken references, disallowed Markdown | `DeckPackageParseError` with all issues | `DECK_PACKAGE_INVALID` | issue paths, lesson ID and line where relevant |
| `schema` is a number other than 4 | `UnsupportedDeckSchemaError` | `DECK_SCHEMA_UNSUPPORTED` (new) | `{ schema }` |
| `createDeckPackage` given content that does not parse | the parse error, unchanged | as above | — |

`DeckParseError` disappears: manifest problems are package problems and are reported as
`DeckPackageParseError` issues with `deck.json` paths. The contract throws no plain `Error` for
content.

## Mobile design

### Storage

`apps/mobile/src/infrastructure/sqlite/schema.ts`:

- `lessons`: drop `content`; add `intro` (text, nullable).
- New `lesson_sections`: `id` (primary key), `lesson_id` (references `lessons.id`, cascade
  delete), `order` (integer, `>= 0`), `title`, `body`; unique `(lesson_id, order)`; index on
  `lesson_id`.
- `flashcards.lesson_section_id` is unchanged.

Rename `DATABASE_NAME` in `src/infrastructure/sqlite/database.ts` to `flashcard-reels-v8.db`, add
`flashcard-reels-v7.db` to `DATABASE_FILES` in `src/infrastructure/app-recovery.ts`, and
regenerate the `0000` baseline as `docs/development.md` describes.

### Installation

`sqlite-deck-package-installation.transaction.ts` writes lessons and their sections inside the
existing transaction, replacing the deck's previous lessons (sections go by cascade). It receives a
parsed `Deck` and performs no content checks of its own.

### Lessons feature

- `domain/lesson.model.ts`: `Lesson` carries `intro: string | null` and
  `sections: readonly LessonSection[]` (`{ id, title, body }`); `content` is removed.
- The repository loads a lesson with its sections in one read, ordered by `order`.
- Delete `domain/lesson-markdown.parser.ts`; nothing in mobile imports Markdown parsing.
- `presentation/controllers/use-lesson.ts` returns the `Lesson`; no parsing step.
- Any code that read `Lesson.content` (search included) uses the title, intro, and section bodies.

### Reader

Replace `lesson-markdown-view.tsx` with three components:

- **`LessonMarkdown`**: the only module that imports `react-native-marked`. Renders one body with
  `useMarkdown(body, { renderer, styles, theme })`, a `Renderer` subclass and styles built from the
  app's design tokens, matching today's typography. It does not use the FlatList-based `Markdown`
  component, because bodies sit inside the reader's `ScrollView`.
- **`LessonSectionView`** (`React.memo`): the section heading in today's section heading style,
  then `LessonMarkdown`. Props: `section`, `highlighted: boolean`, optional `onLayout`. When
  highlighted it draws the existing accent left border over its own heading and body; spacing sits
  inside the section (padding) so the border is continuous.
- **`LessonArticle`**: renders the intro then the sections as a flat list of siblings. Only the
  target section receives `onLayout`, so its `y` is relative to the article, and the existing
  one-time positioning in `sheet-lesson-reader.tsx` keeps working.

`sheet-lesson-reader.tsx` and `screens/lesson-screen.tsx` use `LessonArticle`. If a card's
section is not in the lesson (an invariant violation after validation), the lesson opens at its
start, as today, and the mismatch is logged through the app's existing error reporting.

### Import errors

The import flow shows a specific message for `DECK_SCHEMA_UNSUPPORTED`, for example "This deck
file uses an older format. Download the current version of the deck." Find the existing mapping of
contract error codes and extend it; add a test.

## Tooling

- Move `createContractDeckPackageArchive` (mobile internals) into the contract as
  `createDeckPackage`; delete the mobile file and the `ContractDeckPackageReader` indirection if it
  only forwards. Update every script that imported it.
- `generate-deck-package.mjs`, `generate-demo-deck-package.mjs`, `generate-test-deck-package.mjs`,
  `generate-technical-deck-packages.mjs`, `prepare-curated-decks.mjs`, `recreate-r2-decks.mjs`,
  `inspect-deck-package.mjs`, and `scripts/push-decks-to-r2.mjs` read source directories into a
  file map and call `parseDeckFiles` / `createDeckPackage`. Scripts do not know archive paths.
- Move the comparison in `deck-package-publication.ts` into the contract as
  `compareDeckPackages`. Scripts import it from `@flashcard-reels/deck-contract`; nothing outside
  `apps/mobile/src` imports from it. Lessons compare by title, intro, and section IDs, order,
  titles, and bodies. It warns when a section is removed and a section with the same title is added
  in the same lesson ("keep the original section ID so card links stay attached"), mirroring the
  existing card warning. Parts of the module that depend on R2 or the file system stay in scripts.
- Delete `migrate-lesson-section-ids.mjs` and `lesson-section-migration.transaction.mjs`.

## Web (compatibility only)

- `apps/web/src/server/decks/deck-package.ts`: use `parseDeckManifest`, `deckPackagePaths`, and
  `readDeckContent`; remove its own expected-file logic and plain `Error`s for content.
- `lessons-view.tsx`: render the intro, then each section as a heading plus the existing
  `LessonMarkdown` component for its body. Delete `lib/lesson-text.ts` if nothing else uses it.
  The web keeps `react-markdown`: validation now admits only the allowed subset, so both renderers
  receive the same elements. Remove its `a` and `blockquote` component overrides, which can no
  longer occur.
- `apps/web/src/server/env.ts`: `DECK_PREFIX` becomes required (no `decks/` default). Update
  `docs/web-portal.md` and local environment examples.

## Parts

Commit each part separately. Run each touched workspace's checks per `AGENTS.md` after each part.
Parts 2–6 may leave other workspaces failing in between; the full root validation must pass after
Part 7.

### Part 0 - Owner, on the implementation machine

Download the seven curated packages from `dev/decks/` (schema 3, revision 4, audio included), for
example through the portal's Preview deployment, and unzip each into its own directory under
`apps/mobile/data/decks/` (ignored by Git). An unzipped package has the source directory layout.

### Part 1 - Convert content while the old parser still exists

Write `apps/mobile/scripts/convert-lessons-to-sections.mjs <input-directory> <output-directory>`,
using the current contract functions (`parseLessonMarkdownSource`, `parseLessonDocument`) for
heading positions and existing section IDs.

- The output directory must not exist; the input is never modified. Audio is copied unchanged.
- Intro: text before the first section, without the repeated title heading and marker lines.
  `intro` is `true` only if anything non-blank remains.
- Every heading (any level) becomes a section, in order. ID: the marker UUID. Title: the
  heading's visible text. Body: the lines after the heading up to the next section's marker or
  heading, trimmed, without marker lines.
- Write the new layout, set `schema: 4`, increment `revision`, set the deck's `updatedAt`. Card
  entries do not change.
- Self-checks, failing the run without writing anything: every old section ID exists exactly once;
  every card's `lessonSectionId` still resolves in its lesson; no body is empty; for each lesson the
  concatenated intro and bodies equal the original lines minus marker, title, and heading lines
  (whitespace-normalized).
- Print a report: headings that were level 3 or deeper, titles whose source differs from their
  visible text, and lessons with an intro.

Run it on:

- `apps/mobile/data/demo-deck`: convert to a temporary directory, then replace the demo directory
  with the result so Git shows the conversion. Commit it with the report in the commit body.
- The seven curated decks from Part 0: write each to `apps/mobile/data/decks/<name>-schema-4/`.
  These stay outside Git; put their report in the same commit body.

Edit `apps/mobile/data/test-decks/versioned/v1` and `v2` by hand: `schema: 4` and nothing else
(they have no lessons and must keep revisions 1 and 2).

### Part 2 - Contract

Implement "Deck contract design". Delete the legacy schema support, the custom Markdown parser,
the marker code, the converter from Part 1 (it lives in history), and the old exports. Rewrite the
contract tests against the public interface only.

### Part 3 - Tooling

Implement "Tooling". Regenerate the bundled demo package
(`apps/mobile/assets/decks/7f6f98a7-a84d-4cc8-b744-3d0b53e3c873.fcrdeck`) and the bundled registry
revision; `assert-bundled-deck-packages.mjs` passes. Generate the seven converted curated packages
into `apps/mobile/build/` (ignored) and check each against its `dev/decks/` predecessor with
`compareDeckPackages`: no card added, removed, or changed, and no lesson added or removed.

### Part 4 - Mobile storage and installation

Implement "Storage", "Installation", and the lessons domain and repository changes.

### Part 5 - Mobile reader

Add `react-native-marked` with `npx expo install`. Implement "Reader" and "Import errors".

### Part 6 - Web compatibility

Implement "Web (compatibility only)".

### Part 7 - Documentation and final validation

- `docs/deck-packages.md`: replace the lesson and section format description with schema 4.
- `packages/deck-contract/README.md`: the public interface above.
- Spec 4 and the 2026-10-05 review: one status line pointing to this spec.
- `docs/specs/README.md`: list this spec.
- Root: `npm run check`, `npm test`, `npm run check:dead-code`, `npm run build`, `npm run verify`.

## Functional requirements

1. A card with a section opens its lesson at that section from both the answer and the reading
   button; the section shows the accent border over its heading and body only.
2. A card without a section, and opening a lesson from the lesson list, start at the top.
3. A lesson reads as one continuous article: intro, then each section's heading and body.
4. Importing a schema 1–3 package fails with the unsupported-format message and changes nothing.
5. Importing a schema 4 package with any invalid content fails before any write, and the error
   lists every issue.
6. The web portal lists, shows, and downloads schema 4 packages.

## Non-functional requirements

- Offline: all content comes from the installed package.
- Data safety: card IDs and section IDs survive conversion unchanged.
- Performance: opening the largest current lesson (10 sections, about 10 KB) shows no visible
  delay over today on a low-end Android device.
- Safety: lesson text cannot navigate, load remote content, or contain HTML.

## Out of scope

Deck Studio and any editing UI; nested sections; reading progress or other learner data attached
to sections; publishing to R2.

## Acceptance

Contract tests (public interface only):

- A valid schema 4 package round-trips through `createDeckPackage` and `parseDeckPackage` with
  identical content.
- Each validation rule above has a rejecting case, and one package with several problems reports
  all of them in one error.
- Schemas 1, 2, and 3 throw `UnsupportedDeckSchemaError` with the schema in its context.
- Every allowed Markdown element is accepted; every rejected element is rejected with its lesson,
  section, and line, including a heading inside a section body; `#` lines inside code blocks are
  accepted.
- Every deck source in the repository parses with `parseDeckFiles`. The seven curated packages
  generated in Part 3 parse with `parseDeckPackage` (checked once by the implementer; they are not
  in Git, so not in the test suite).

Mobile tests:

- Installation stores lessons and sections in order; a higher revision replaces them; deleting
  the deck removes them; an invalid package leaves stored content and progress unchanged.
- The reader highlights exactly the target section, positions to it, and opens at the start when
  the target is missing.
- Unsupported-format import shows its specific message.

Device check (owner): the phone acceptance list in the 2026-10-05 review, against the converted
demo deck; plus a backup made on the v7 build restores progress on the v8 build after the decks
are installed.

Owner step after implementation: publish the seven packages from `apps/mobile/build/` with
`--environment=dev`, replacing the schema 3 packages there. Production stays untouched until
release.

## Time budget

Owner to set.

## Release

There are no users besides the owner. At release, the owner replaces every package under `decks/`
with its schema 4 version and installs the new APK. No older APK or package is kept compatible.

## Open questions

None.
