# Functional requirements

Status: approved by the owner on 2026-09-28. Changes are deliberate edits.

This file is the short, central list of what Flashcard Reels does and does not do in Phase 0.
Other docs explain how things work. When they disagree with this file, this file wins.

**Phase 0 goal:** one learner studies daily on an Android phone from a release APK and never
loses progress.

- **Audience:** the owner only. Other users come later.
- **Done:** every item in [Closing Phase 0](#closing-phase-0) passes. The result is a new
  release APK that the owner uses daily. No check is skipped to meet a date.
- **Method:** each requirement below is the owner's decision. Where the app differs, the
  difference goes in the gap list and is closed by adding or changing a feature.
- **Order:** functional requirements first, then a spec for each gap that needs one, including
  its layout, then implementation.
- **Scoped work:** each task is one pull request that states its scope in one sentence and
  names the requirement or gap it serves. Its review is a written list of findings, and each
  one is fixed or rejected with a reason before merge. It adds or updates tests for the
  behavior it changes. No pull request rewrites more than one area at once.
- **No legacy before release:** until Phase 0 closes, fix the design instead of adding
  workarounds or compatibility code for earlier builds. This includes regenerating the database
  baseline and changing the backup format directly. From the first daily-use APK onward, database
  changes are forward migrations and older backups stay readable.
- **UI is not fixed:** there are no other users yet, so screens and navigation can be
  reorganized freely to meet these requirements.

Every requirement follows from the [principles](principles.md). The order of work and later
phases are in the [roadmap](roadmap.md).

## Mobile app

### Navigation

- N1. Five destinations, in swipe order: Discover, Focus, Reading, Decks, Settings.
- N2. A horizontal swipe moves between all five, and the bottom bar follows the swipe. The
  learner never has to tap the bar to move, though tapping works too. A tab component that only
  switches on tap does not meet this.
- N3. The bottom bar has four items. Study covers both Discover and Focus.
- N4. A header over the two feeds shows which one is open. It is not a control.
- N5. Decks replaces Library and Progress: one list with each deck's lessons read and cards
  reviewed. A deck's page holds its lessons, cards, progress, appearance, reset, and remove.
- N6. Code names match these destination names.

### Study

- S1. The app opens on Discover with a card already showing. Discover mixes cards from every
  installed deck.
- S2. A vertical swipe moves between cards. The feed never ends, like a social feed, and has no
  daily limit.
- S3. The answer is hidden until the learner double-taps, the same gesture as a "like".
- S4. The learner rates recall as Again, Hard, Good, or Easy. Ratings schedule later reviews
  with FSRS.
- S5. Swiping past a card without rating it records nothing.
- S6. Going back never reopens a finished review.
- S7. Holding a card that catches the learner's interest for 0.9 seconds opens Focus on that
  card's deck, keeping the card's revealed side and rating. Focus also opens from holding a deck in Library or tapping a card's deck
  label.
- S8. Tapping the audio button reads the whole card: the question, a pause, then the answer.
  Hearing the question keeps the answer in context. Tapping again replays it. Audio never
  plays automatically.
- S9. Discover resumes where it left off. Focus starts a new session after 5 minutes of
  inactivity.

### Reading

Lessons solve deck onboarding: a new deck should not start by testing material the learner has
never seen.

- R1. Reading shows a card for each installed deck that has lessons. Tapping it lists the
  deck's lessons in suggested order.
- R2. A lesson shows headings, paragraphs, bold, italic, lists, inline code, and code blocks.
  Other syntax shows as plain text. Nothing loads from the network.
- R3. Next to the Study Island, a Reading button opens a bottom sheet over the card, like a
  comments sheet. Closing it returns to the same card.
- R4. Reading is optional. Nothing requires reading a lesson before studying its cards. Reading
  state is shown, but it never blocks or reorders study.
- R5. A card can point to the lesson section that explains it. The sheet opens on that section,
  highlighted, instead of the deck's whole lesson list. A section is the smallest unit: the
  point is a fuller explanation than the card, so no sentence or paragraph highlights.
- R6. A lesson ends with a button: **Mark as read** the first time, **Mark as revisited** after
  that. Completion is recorded only by this button, never inferred from scrolling. The bar that
  fills with the deck's color while scrolling stays as visual feedback only.
- R7. Lesson lists show which lessons are read.
- R8. A card whose lesson is not read yet shows an "uncovered" tag. Tapping it opens the lesson.
- R9. Every read and revisit is kept in an append-only history. A lesson shows when it was
  first read and last revisited. Whether revisit dates help is an experiment; the history is
  kept either way, because it cannot be rebuilt later.

### Decks

- D1. A bundled demo deck works offline on first launch, so the feed is never empty.
- D2. A `.fcrdeck` package imports from a file or from a portal QR code. Both paths validate
  and install the same way.
- D3. An invalid package is rejected with a short message. No deck, card, lesson, or audio
  file from it remains.
- D4. The same revision again does nothing. A higher revision updates content and keeps
  history. A lower revision is rejected.
- D5. Decks searches decks, browses a deck's cards, and sets a deck's appearance preset.
- D6. Removing a deck keeps its progress as an archive. Reinstalling it asks whether to
  continue or start fresh.

### Progress

- P1. Progress shows totals for cards, reviewed, and new, then one row per deck with how many
  of its cards are reviewed. Tapping a deck shows its cards and their ratings.
- P1a. The Progress tab also shows lesson progress. The layout is settled in the G3 spec and
  may reorganize the tab. Starting point: each deck row shows how many of its lessons are read,
  and the deck view lists its lessons with first-read and last-revisited dates above its cards.
- P2. Learning can be reset for one card, one deck, or everything. Decks stay installed.
- P3. All learning progress exports to one JSON file. Importing a file shows a preview, then
  replaces local progress and keeps the old progress as a safety copy.
- P3a. Backups are manual. Progress is safe up to the last export the learner made.
- P4. Reading history follows the same rules as review history. It is included in backup
  export and import, archived when its deck is removed, and cleared by the matching reset.

### Settings

- C1. Appearance: light, dark, or device.
- C2. Study Island: left, right, or bottom, and rating direction.
- C3. Audio, the Reading button, and haptics can each be turned on or off. Audio and
  Reading buttons can change sides.
- C4. Full app data reset, with confirmation.
- C5. App information.

### Privacy

- PR1. Decks, audio, preferences, and learning history stay on the device.
- PR2. No account is needed. The app uses the network only to download a deck from a QR code.

## Web portal (internal)

The portal is how decks reach the phone: decks are published to R2, shown in the portal, and
installed on the phone by scanning a QR code.

- W1. Sign-in uses one shared team password.
- W2. Users search the deck catalog, browse cards and reveal answers, and read lessons.
- W3. A deck downloads as `.fcrdeck` or sends to the phone with a QR code that expires in
  10 minutes.
- W4. The catalog lists every package in R2.

## Deck publishing (owner tooling)

- T1. Decks are written in the repository and packaged with `decks:generate`.
- T2. Publishing runs the publish check. It blocks ID and revision mistakes, and uploads only
  after the owner types a confirmation.
- T3. Deck audio is generated by the sibling `audiofier-tts` repository.

## What the app does not do

- No accounts, sync, or cloud backup.
- No creating or editing cards or decks in the app.
- No reminders or notifications.
- No sharing decks from the app.
- No Google Play, iOS, or web release. Android APK only.
- The portal does not store progress, edit decks, or upload packages.
- The portal has no user accounts or deck ownership. One shared password protects it.
- No daily limits, study goals, or "caught up" marker in the feed.
- No reading progress inferred from scrolling.
- No notice when a newer revision of an installed deck is published. The learner installs the
  new revision from the portal.
- No onboarding that asks about the learner's study habits.

## Open decisions

_None right now._

## Closing Phase 0

Phase 0 closes when every check below can be observed. None of them should be rushed. Numbers
marked _proposed_ are starting values for the owner to adjust.

- Q1. **Gaps closed.** The gap list is empty, and each closed gap names the commit that closed
  it.
- Q2. **Content.** Each daily deck:
  - is published to the prod channel at its latest revision, so the publish check reports it
    unchanged;
  - passes `decks:inspect`;
  - has lessons.

  Daily decks: **System Design** and **React** first, then **Databases** and **Computer
  Science**. A **Networking** deck is still to be written. Refining their content, section
  links, and the Networking deck happens in the week of daily use after Phase 0. During Phase 0,
  features are tested with small dev decks instead.

- Q3. **Code review.** Every feature folder and the web app has a review note that lists its
  findings, and each finding is fixed or rejected with a reason. Each module passes these
  checks:
  - **Components:** the "You can see it when" checks of
    [codebase preferences §14](codebase-preferences.md#14-presentational-components).
  - **Pure logic:** the checks of [§15](codebase-preferences.md#15-pure-logic-in-plain-functions).
  - **Styles and constants:** the checks of [§16](codebase-preferences.md#16-styles-and-constants).
  - **Errors:** no empty `catch`. Every caught error is either rethrown as a typed app error
    with a code, or shown to the learner as a toast or recovery screen. Every promise is
    awaited or explicitly handled.
  - **Validation:** every outside input is parsed with a Zod schema before use: deck packages,
    backup files, QR links, route params, stored preferences, and portal requests. Parsed
    outside data is never cast with `as`.
  - **Complexity:** no loop over cards, lessons, or reviews nested inside another such loop on
    the study path. Lookups by ID use a `Map` or `Set`.
  - **Deep modules:** code outside a feature uses it only through its application service or
    its controller hooks. Completing one learner action takes one call into the feature, not a
    sequence of calls the caller must get right.
  - **Libraries:** each hand-written parser, cache, date helper, or gesture helper has a
    recorded keep-or-replace decision that names the library considered.
  - `npm run verify` passes.
- Q4. **Tests.**
  - Every requirement ID in this doc maps to at least one unit test, integration test, Maestro
    flow, or manual checklist item, in a coverage table in `docs/manual-device-testing.md`.
  - Every test name states a behavior a learner or another system would notice
    ([§12](codebase-preferences.md#12-tests-protect-behavior)).
  - For a sample of requirements, deliberately breaking the behavior makes a test fail.
  - Maestro flows pass on the release APK for: study and rate, hold to Focus, import a deck
    file, read a lesson and mark it read, export and import a backup, continue or start fresh
    after a reinstall, and reset a deck.
- Q5. **Device.**
  - Every item in the manual checklist is checked on the owner's phone, with the commit, build,
    device, and date recorded.
  - Update test: rate cards on build N, install build N+1 over it, and the review counts,
    lesson reads, and due cards are unchanged.
  - Speed, measured once at the end on the release APK: from tapping the app icon, Discover
    shows its first card within 1 second. That still holds with a 5,000-card stress library
    installed, and the performance monitor stays above 55 fps while swiping through 30 cards.

## Gap list

Differences between these requirements and the app. Q1 passes when this list is empty.

- G1. **Card-to-lesson sections (R5).** Half built: each card has a `lessonId` and opens its
  linked lesson. Still missing: addressable sections inside a lesson, a card reference to one,
  and opening the sheet on that section highlighted. Needs a spec, because it changes the deck
  format. The lesson parser already produces a flat block list with heading levels, so a section
  can be a heading and the blocks under it. The open part is giving sections stable IDs.
- G2. **One audio file per card (S8).** Closed by merging `feat/curated-deck-packages-v1` into
  `phase-0`: one `audio/<card-id>.mp3` per card reads the question, a pause, and the answer.
- G3. **Lesson completion and history (R6, R7, R9, P4).** Not built. Needs new learning data
  and a change to the backup format, so it needs a spec.
- G4. **Uncovered tag on cards (R8).** Not built. Depends on G1 for which lesson a card belongs
  to, and on G3 for whether it is read.
- G5. **Navigation restructure (N1–N6).** Merge Library and Progress into Decks, rename
  Controls to Settings and the "For you" label to Discover, and rename code to match. Needs a
  spec for the Decks list and deck page layout. Best done together with G3, which also changes
  what the deck screens show.
- G6. **Deck channels.** Built on `p0/deck-channels`: R2 holds a **prod** channel under `decks/`
  and a **dev** channel under `dev/decks/`, the portal reads the one set by `DECK_CHANNEL`, and
  the publisher requires `--channel`. Dev holds three 20-card test decks from
  `apps/mobile/data/dev-decks/`. Prod keeps serving the current `main` portal and APK. Owner
  steps: set `DECK_CHANNEL` in Vercel (prod for Production, dev for Preview) and in
  `apps/web/.env.local`, then publish the dev decks. Closes when `phase-0` merges and prod
  switches to the schema 1 daily decks.

### Accepted design direction

The owner accepted this direction for the G1, G3, and G5 specs. Details are tuned after it is
built and used.

- **Deck page as a profile page.** A header with cover, title, lessons read, and cards reviewed,
  and one **Study this deck** action that opens Focus. Below it, **Lessons** and **Cards** tabs.
  Appearance, info, reset, and remove sit in a ⋯ menu. The page has one mode.
- **Decks list.** Search, import, totals, and one row per deck with thin lesson and card
  progress bars in the deck's color. Paused decks show inline. Archived progress moves here from
  Settings.
- **Reading as "what to read next".** The next unread lesson for each deck, then lessons read
  longest ago. The full lesson list lives on the deck page.
- **Lesson view.** "Lesson 3 of 5", the scroll bar, the Mark as read or revisited button with
  its dates at the end, and a link to the next lesson.
- **Lesson sheet from a card.** It opens at half height on the section that explains the card.
  Dragging up or tapping **Read full lesson** shows the whole lesson, scrolled to that section.

## Doc and repository follow-ups

- Specs are decision records and keep the names and roadmap references used when they were
  written.
- `docs/manual-device-testing.md` and the docs that name Library, Progress, and Controls change
  with G5.
