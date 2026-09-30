# Lesson section references: implementation and device review

Feature branch: `feat/lesson-section-references`, based on `develop`. No catalog publication is
part of this change. [Spec](../specs/4-lesson-section-references.md).

## Implemented behavior

The shared contract parses the supported Markdown subset into ordered blocks and a section tree
with heading paths and block ranges. Original heading depths are retained even when mobile uses
only three typography styles. The parser is independent of React, SQLite, and Expo.

Schema 2 optionally links cards to derived sections; schema 1 remains readable. Both full package
validation and portal content loading reject unresolved destinations. The mobile installer stores
the reference alongside the existing lesson link, and both answer taps and the reading button
carry it to the sheet. The reader waits for content, viewport, document, and target layout before
positioning once per opening. A short line and “Related section” label mark the start. Subsequent
scrolling remains under learner control. Close, lesson-list selection, and next lesson clear the
old reference; another card opening gets a fresh reader even within the same lesson.

The generated demo has 20 cards, five lessons, and the original six audio recordings. Existing
deck, lesson, and card IDs are preserved; added content uses new IDs and demo revision 2. The
added cards have no audio. Scaling contains nested benefits, limitations, and an example; two
cards share its vertical-scaling destination. Caching includes another shared destination.

## Validation

- `npm run verify`: passed. Formatting, custom lint rules, lint, TypeScript, 420 Vitest tests
  (349 mobile, 40 web, 31 contract), dead-code check, and web production build.
- Mobile `npm run db:check` and `npm run check:android`: passed, including bundled-package checks
  and Android JavaScript/assets export.
- The demo installation scenario queries freshly constructed SQLite repositories, checks every
  supplied destination, changes a destination through a higher deck revision while retaining a
  real review-count row, and rejects a broken update without replacing installed references.
- Parser scenarios cover parent/subsection boundaries, depth four, code fences, duplicate
  headings, Unicode normalization, heading-free content, and destinations surviving prose edits,
  unrelated section insertion, and line-ending changes.
- Navigation tests use the real provider, reading button, and lesson list, with the native reader
  as the presentation boundary. Native geometry and gestures still require device acceptance.
- Maestro execution was attempted. Its CLI is unavailable in PATH and at the installation path
  documented in the machine handoff; the new flow has **not** been executed.

## Phone acceptance

Launch the feature branch's app on Expo Go. It uses `flashcard-reels-v6.db` and starts with fresh
study data under the Phase 0 convention. The previous `flashcard-reels-v5.db` remains separate;
this branch does not migrate its study data. Switching back to develop uses that previous database.

From `apps/mobile`, the direct tunnel command avoids this machine's npm argument forwarding issue:

```powershell
node ../../node_modules/expo/bin/cli start --tunnel
```

Hold the demo deck in Decks to enter Focus. Check these cards:

| Card                                     | Expected lesson position                           |
| ---------------------------------------- | -------------------------------------------------- |
| What is a JavaScript value?              | Values and types, beginning, no section marker     |
| Primitive versus object                  | Why it matters                                     |
| What does undefined mean?                | undefined                                          |
| What is null used for?                   | null, within the same lesson as the preceding card |
| What is vertical scaling?                | Vertical scaling, including its subsections below  |
| Can more CPU cores fix every bottleneck? | Same Vertical scaling destination                  |
| What limits vertical scaling?            | Vertical scaling / Limitations                     |
| What is an idempotent operation?         | Reliable requests, beginning, no section marker    |
| What should you measure before scaling?  | No lesson action                                   |

Try both opening gestures. Scroll away from the marker and check that the reader does not snap
back. Close the sheet and check that the same card remains. Go back to the lesson list and open
the lesson normally: the old marker should disappear. Relaunch the app and try linked cards again.
Check light/dark appearance, larger text, long sections, and targets near the document bottom.

For a native test build with Maestro configured, run from `apps/mobile`:

```powershell
maestro test .maestro/lesson-section-references.yaml
```

The flow clears the dedicated native test app's state and checks normal reading, both opening
gestures, destinations within the same lesson, shared parent sections, a nested section, and
returning to the same card.

## Follow-ups

Generated heading paths are deterministic references within content, not permanent semantic IDs.
Renaming/moving headings needs relinking. Reordering identically named sibling headings can leave
a reference resolving to a different occurrence; publish review must check meaning, not merely
existence. Future Deck Studio should surface these changes for review rather than guessing.

Keep heading syntax and normalization part of the versioned package contract. Supporting more
Markdown syntax later must account for the destinations it creates. Curated decks can be annotated
after this demo's device acceptance, using the inspector's paths and a content review per card.
