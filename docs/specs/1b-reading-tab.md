# 1b - Reading tab and lessons

Status: draft for owner review. Depends on [1a](1a-study-tab.md) for the free bottom tab.

## Problem and value

A new deck starts by testing the learner on material they have never learned. The first ratings
of a new System Design deck are "Hard" because the learner has not met the material yet, not
because they forgot it. Short lessons give an optional way to learn a deck's material by reading.
When the learner meets the cards afterwards, the test measures memory rather than first
exposure.

Reading is optional depth. The feeds remain the main entry point, and nothing requires a lesson
before studying. This step serves roadmap item 10 (context and reading experience). It is also the
first step toward the knowledge model in item 7, made by adding content rather than changing the
card.

## Functional requirements

1. A deck package can include lessons. A lesson has a stable ID, a title, a position in the deck,
   and Markdown content of about one or two pages.
2. Each deck has an ordered list of self-contained lessons, with no chapters or other
   hierarchy. The order is a suggested path, not a requirement.
3. A new Reading bottom tab lists the lessons of installed decks, grouped by deck, in lesson
   order.
4. Opening a lesson shows it in a full-screen reader. Going back returns to the list at the same
   scroll position.
5. The reader renders a defined Markdown subset: headings, paragraphs, bold, italic, bulleted and
   numbered lists, inline code, and code blocks. Other syntax appears as plain text.
6. Decks without lessons do not appear in the Reading tab. When no installed deck has lessons,
   the tab shows an empty state explaining that lessons come with decks.
7. Lessons are deck content. They install, update, and uninstall with their deck. They create no
   learning data.

## Non-functional requirements

- **Offline:** lessons ship inside the deck package and never load anything from the network.
- **Safety:** the renderer does not execute HTML or scripts from lesson content, and it does not
  load remote images or other remote resources.
- **Compatibility:** packages with lessons need the updated app because the current package schema
  rejects unknown fields. This is acceptable while there are no other users. Packages without
  lessons keep working unchanged.
- **Package limits:** lesson content counts toward the existing package size limits.

## Out of scope

- Links between cards and lessons, and the bottom sheet from a card (step 2).
- Marking lessons as done, tracking reading time or scroll progress, and any effect on scheduling.
- Lesson audio.
- Chapters or other lesson hierarchy.
- Lessons in the web portal.

## Hard-to-reverse decisions

These are the owner's sign-off items:

1. **Lessons in the package.** Proposed: `deck.json` gains an ordered `lessons` list of IDs,
   titles, and positions. Each lesson's Markdown is stored as `lessons/<lesson-id>.md`, following
   the existing `audio/` pattern.
2. **Stable lesson IDs,** governed by the same rules as card IDs and covered by the
   [publish check](0-deck-publish-check.md). Step 2 will attach card links to these IDs.
3. **The supported Markdown subset** in requirement 5. Adding syntax later is easy. Removing
   supported syntax would break lessons that use it.

## Acceptance

1. A System Design package with at least three lessons written by the owner installs through the
   normal import path, and its lessons appear in the Reading tab in order.
2. Every supported Markdown element renders correctly on the Android device. Unsupported syntax
   appears as plain text without errors.
3. Updating the deck to a version with an edited lesson shows the new content. Removing the deck
   removes its lessons.
4. Studying, progress, backup, and archived progress behave exactly as before.
5. The package inspector reports a package's lessons.
6. `npm run check` and `npm test` pass in `apps/mobile`.

## Time budget

Proposed: one to two weeks of evenings. Owner to confirm.

## Open questions

1. **Tab position:** where the Reading tab sits in the bottom bar, for example between the study
   tab and Library.
2. **Pending decks:** whether a reinstalled deck that is waiting for the continue or start-fresh
   choice shows its lessons. Proposed: yes, because lessons are content and create no learning
   data.
