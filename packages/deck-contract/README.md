# Deck contract

This package owns schema 4 manifests, paths, lesson validation, reproducible archives, and
content comparison. Import only from `@flashcard-reels/deck-contract`; submodules are private.
See [the package format](../../docs/guides/decks.md).

## Public types

- `DeckManifest`: validated `deck.json`; lessons have `intro: boolean` and ordered section IDs/titles.
- `Deck`: resolved manifest; lessons have `intro: string | null` and section bodies.
- `Lesson`: `{ id, title, intro: string | null, sections: readonly LessonSection[] }`.
- `LessonSection`: `{ id, title, body }`.
- `Flashcard`: manifest card, including required nullable `lessonId` and `lessonSectionId`.
- `DeckPackage`: `{ deck: Deck; audio: ReadonlyMap<string, Uint8Array> }`, audio keyed by card ID.
- `DeckComparison`: added, removed, changed and reordered cards/lessons; metadata/audio changes;
  warnings about replacing stable IDs. Lesson comparison includes intro and section identity,
  order, title, and body.

## Public functions

```ts
parseDeckPackage(bytes: Uint8Array): DeckPackage
parseDeckFiles(files: Readonly<Record<string, Uint8Array>>): DeckPackage
parseDeckManifest(bytes: Uint8Array): DeckManifest
checkDeckPackageEntries(manifest: DeckManifest, entrySizes: ReadonlyMap<string, number>): void
deckLessonTextPaths(manifest: DeckManifest): readonly string[]
readDeckContent(
  manifest: DeckManifest,
  entrySizes: ReadonlyMap<string, number>,
  lessonFiles: ReadonlyMap<string, Uint8Array>
): Deck
createDeckPackage(deckPackage: DeckPackage): Uint8Array
compareDeckPackages(published: DeckPackage, candidate: DeckPackage): DeckComparison
```

`parseDeckPackage` checks ZIP safety and limits, then delegates to `parseDeckFiles`, which
validates the manifest, exact file set, UTF-8 bodies, allowed Markdown, references, and audio.
`parseDeckManifest` validates a manifest and its relationships without fetching content.
`checkDeckPackageEntries` checks that an archive's entry list (path to uncompressed size) holds
exactly the declared files, none empty. `readDeckContent` runs that check, then decodes and
validates every intro and section from the supplied lesson file bytes; the web fetches only the
`deckLessonTextPaths` entries by byte range, so it never downloads audio. Callers never build
archive paths themselves.

`createDeckPackage` builds a deterministic ZIP and verifies it through `parseDeckPackage`.
`compareDeckPackages` compares parsed packages; filesystem and R2 operations belong to scripts.
Parsed content can be trusted without a separate validation step.

## Constants and errors

Exports: `DECK_PACKAGE_LIMITS`, `DECK_SCHEMA_CONSTRAINTS`, `DECK_SCHEMA_VERSION` (4),
`DeckContractError`, `DeckPackageParseError`, `UnsupportedDeckSchemaError`, and types
`DeckPackageParseIssue`, `DeckContractErrorCode`, `DeckContractErrorContext`.

Invalid content produces `DeckPackageParseError` (`DECK_PACKAGE_INVALID`) with collected
`issues`: path, message, and optional lesson ID, section ID (null for intro), and one-based line.
Numeric schemas other than 4 produce `UnsupportedDeckSchemaError` (`DECK_SCHEMA_UNSUPPORTED`)
with `{ schema }` context before other checks. Errors carry name, code, message, cause, and
optional context without depending on app errors. Programming errors propagate normally.
The writer preserves its verification parse error unchanged.

No legacy schema, marker parser, heading-derived identity, or combined Markdown document is
exported. Contract validation and the mobile renderer use one exact `marked` version.

From the repository root:

```bash
npm run check -w @flashcard-reels/deck-contract
npm test -w @flashcard-reels/deck-contract
```
