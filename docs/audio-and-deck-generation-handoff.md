# Audio generation and deck regeneration handoff

Copy the instructions below into the other Codex instance. This handoff includes
the target package format because the receiving checkout may not have this branch.

---

Generate the missing deck audio and regenerate validated deck packages for later
upload. Do not upload, push, or merge. Work only on audio authoring, deck sources,
and the tooling necessary for this task. Preserve unrelated local changes.

## Read first

Read these files when they exist in your checkout. If develop lacks the new
contract or generators, use the complete examples and validation rules below to
build equivalent local authoring tools. Do not depend on this unpublished branch.

- `AGENTS.md` and `apps/mobile/AGENTS.md`
- `docs/codebase-preferences.md`
- `docs/deck-packages.md` and `docs/audio-generation.md`
- `packages/deck-contract/src/deck.schemas.ts`
- `packages/deck-contract/src/deck.constants.ts`
- `apps/mobile/scripts/generate-technical-audio.mjs`
- `apps/mobile/scripts/generate-deck-package.mjs`
- `apps/mobile/scripts/prepare-curated-decks.mjs`

## Source of truth and starting state

Use `apps/mobile/data/decks/*/deck.json` as the content source of truth when
available. If your checkout still has the older technical library, preserve its
existing content and IDs while converting it to the manifest below. Do not invent
missing curated content; report sources absent from your checkout.

The following state was observed on the unpublished branch, and may differ in your
checkout. Recheck it before making changes:

- Seven curated decks, all at revision 2.
- Six decks contain 674 audio-enabled cards with matching audio files available.
- System Design Foundations contains 50 cards with `audio: false`.
- The older technical library contains 674 cards and already has audio for all of
  them. The existing `audio:technical:generate` command reads that older library;
  it does not generate the 50 Foundations recordings.

Existing audio can come from a source deck's `audio` directory or, as a fallback,
`apps/mobile/data/technical_flashcard_library/audio`. Verify that reused recordings
match the current curated card text. Do not assume a matching ID proves that the
recording is current.

## Deck package contract

A `.fcrdeck` file is a ZIP with this structure:

```text
<deck-id>.fcrdeck
  deck.json
  audio/<card-id>.mp3
  lessons/<lesson-id>.md
```

The shared `@flashcard-reels/deck-contract` parser is the validation authority.

- Deck fields: `schema`, `id`, `authorId`, `revision`, `title`, `description`,
  `createdAt`, `updatedAt`, `cards`, and `lessons`.
- Card fields: `id`, `question`, `answer`, `lessonId`, `audio`, `createdAt`,
  `updatedAt`, and optional nullable `lessonSectionId`.
- Lesson fields: `id` and `title`.
- IDs are UUIDs; timestamps are ISO datetime strings with a timezone.
- Array position determines card and lesson order. Do not add `order` fields.
- Unknown manifest fields are rejected.
- Schemas 1 and 2 are readable. Non-null section references require schema 2,
  a lesson in the deck, and a section that resolves in its packaged Markdown.
  Adding audio alone does not require a schema change.
- Each `audio: true` card requires one nonempty `audio/<card-id>.mp3` file.
  Cards with `audio: false` must have no packaged audio file.
- Each listed lesson requires a nonempty `lessons/<lesson-id>.md` file.
  Unreferenced archive files are rejected.
- Maximum sizes: 5 MiB per audio file, 256 KiB per lesson, 8 MiB manifest,
  64 MiB compressed package, and 128 MiB expanded package.
- Each deck has 1-1,000 cards and at most 200 lessons.

## Complete example: deck.json

This is a complete schema 2 manifest, not pseudocode. It demonstrates one card
with combined audio and a lesson section, plus one card without audio or a lesson.
The sample IDs belong only to this example: use each actual deck's existing IDs.
The revision 3 illustrates adding audio to an existing revision 2 deck.

```json
{
  "schema": 2,
  "id": "b0612d11-1111-4f6a-b69b-70d76fd95b30",
  "authorId": "bf0b5aa7-18d6-4b36-aae9-5aa93f93235e",
  "revision": 3,
  "title": "Example System Design Deck",
  "description": "Two cards demonstrating the current package contract.",
  "createdAt": "2026-09-25T00:00:00.000Z",
  "updatedAt": "2026-10-02T12:00:00.000Z",
  "cards": [
    {
      "id": "919c713a-4aef-4c96-a107-7cab7134dfbe",
      "question": "What is throughput?",
      "answer": "Throughput is the amount of work a system completes per unit of time.",
      "lessonId": "a4378c2f-4c3c-416f-a64f-611c5999469f",
      "lessonSectionId": "throughput",
      "audio": true,
      "createdAt": "2026-09-25T00:00:00.000Z",
      "updatedAt": "2026-10-02T12:00:00.000Z"
    },
    {
      "id": "ae3210b0-7fa1-4384-bdb3-7536bff7668f",
      "question": "What is scalability?",
      "answer": "Scalability is the ability to handle more load by adding resources.",
      "lessonId": null,
      "lessonSectionId": null,
      "audio": false,
      "createdAt": "2026-09-25T00:00:00.000Z",
      "updatedAt": "2026-09-25T00:00:00.000Z"
    }
  ],
  "lessons": [
    {
      "id": "a4378c2f-4c3c-416f-a64f-611c5999469f",
      "title": "Performance basics"
    }
  ]
}
```

For this exact manifest, the ZIP must contain exactly these three files at its
root paths, with no enclosing source directory:

```text
b0612d11-1111-4f6a-b69b-70d76fd95b30.fcrdeck
  deck.json
  audio/919c713a-4aef-4c96-a107-7cab7134dfbe.mp3
  lessons/a4378c2f-4c3c-416f-a64f-611c5999469f.md
```

The lesson file's complete content is:

```markdown
# Throughput

Throughput is the amount of work a system completes per unit of time.
For example, a service may handle 500 requests per second.
```

The heading supplies the section ID `throughput`. A card can instead use
`lessonSectionId: null` or omit it to open its lesson at the beginning. For
schema 1, omit section references or set them to null. An audio-only deck may use
`lessons: []` and `lessonId: null` on every card.

Every field in the example is required except `lessonSectionId`, which is optional
and nullable. `lessonId` is required even when null; `lessons` is required even when
empty. Questions, answers, titles, and section IDs must be nonempty. Revision is
an integer of at least 1; schema is the number 1 or 2. Description may be empty.
Section IDs are at most 512 characters. Card IDs must be unique; lesson IDs must
be unique and must not overlap card IDs. A referenced lesson must be in the same
deck. The curated output set must also have no overlapping deck/card/lesson IDs
between decks.

## Combined audio: the format audiofier-tts must produce

Use the audiofier-tts project and workflow you already know to create the audio.
The final published asset is **one MP3 per card**, named only by its card UUID:

```text
audio/<card-id>.mp3 = spoken question + audible pause + spoken answer
```

For the first example card, the actual recording must sound like:

```text
What is throughput?
[short silence]
Throughput is the amount of work a system completes per unit of time.
```

The silence is part of the recording; do not speak "short silence" or "pause".
The package contract does not prescribe an exact pause duration. Use the existing
audiofier-tts convention and listen to a sample to confirm the pause is audible.

The legacy split files `<card-id>.question.mp3` and `<card-id>.answer.mp3` are not
valid package assets in this contract. They may be intermediate inputs, but the
final archive must contain only `audio/<card-id>.mp3`. If audiofier-tts produces
separate segments, decode them, insert actual silence, concatenate question then
answer, and encode one valid MP3. Do not join MP3 files by raw byte concatenation.
Do not package temporary WAVs, split segments, TTS job metadata, or source text.
No `questionAudio`, `answerAudio`, or audio path fields belong in `deck.json`;
`audio` is a boolean and the file path is derived from the card ID.

## Audio generation

1. Audit every curated source deck's audio coverage and identify missing or stale
   recordings. Include all 50 System Design Foundations cards.
2. Generate through audiofier-tts using its documented local setup. Adapt the
   input to the actual deck manifests. If the reference script exists in your
   checkout, its local API workflow can be reused; its observed defaults are:
   - URL: `http://127.0.0.1:8765`, overridden by `AUDIO_GENERATOR_URL`.
   - Model: `kokoro`; voice: `af_heart`; speed: `1`.
   - Health endpoint: `GET /health`.
   - Job creation: `POST /jobs`; polling: `GET /jobs/<jobId>`.
   - The existing job payload supplies `text`, `stem`, `suffix`, `outputDir`,
     `modelId`, `voice`, `speed`, and `wavOnly: false`.
   - A successful job returns `result.mp3Path`, which the generator copies.
3. Verify that the local audio service is running and its output paths are readable
   from this machine. If unavailable, report the required service setup; do not
   fabricate recordings or enable audio without files.
4. Each recording must contain the spoken question, a short pause, and the spoken
   answer. Listen to representative recordings, including technical terms, code,
   and longer answers. The archive parser checks presence and size, not pronunciation.
5. Save new recordings under the relevant source deck's
   `audio/<card-id>.mp3`. Avoid rewriting valid existing recordings unnecessarily.
6. Set `audio: true` only after the corresponding recording succeeds.

## Identity and revisions

Preserve deck, author, card, and lesson IDs, content text, lesson references, and
array ordering. Audio additions must retain the learner's existing card identity.

Increase `revision` once per changed deck, above its existing and published
revision when that published revision is known. Update relevant `updatedAt`
timestamps and preserve `createdAt`. Importing an already installed revision is
a no-op, so changed audio must not be published under that same revision.

Write text files as UTF-8 without a BOM. Keep app behavior, schema SQL, and unrelated
local edits unchanged.

## Regenerate and validate

When these generators exist, run from `apps/mobile` using PowerShell:

```powershell
npm.cmd run decks:curated:prepare
npm.cmd run decks:inspect -- build/curated-decks/<deck-id>.fcrdeck
```

Replace the placeholder with each actual deck ID and inspect every generated
package. `decks:curated:prepare` generates packages, validates them through the
shared parser, and checks deck/card/lesson ID collisions across source decks.

Outputs:

- Individual packages: `apps/mobile/build/curated-decks/<deck-id>.fcrdeck`.
- Upload bundle: `flashcard-reels-decks.zip` at the repository root.

Generated packages and the upload ZIP are ignored by Git. Source manifests and
lessons are versioned. `decks:packages` regenerates only the bundled demo;
`decks:check` checks the bundled registry. Neither replaces curated generation.

If these commands or the shared parser are absent on develop, build equivalent
local tools: write the exact manifest shape above, create a ZIP with only referenced
assets, and validate the listed field, identity, reference, size, and audio rules.
For decks without section references, schema 1 is sufficient; do not implement
heading normalization just to add audio. Preserve source ordering when converting
legacy records with explicit order fields, then omit those fields from the manifest.
Keep application data such as deck theme, learning progress, and per-card deckId
out of the manifest. Do not alter app code to accommodate the generated archives.
Report whether validation used the current shared parser or a local compatibility
validator; do not claim shared-parser validation when it was unavailable.

If tooling changes, run its relevant tests and checks. Do not start publication
or upload as part of this task.

## Final report

Report each deck's card count, audio coverage, revision before/after, package size,
and validation result. Include the generated ZIP's absolute path, any missing
recordings or service blockers, and the files changed. State that nothing was
uploaded, pushed, or merged.
