# Specs

This page is the project dashboard: what is being built, what is waiting on the owner, and what is
done. Update it in the same commit as the work.

## Status

**Phase 0 — closing.** Every spec so far is built. The first release is blocked only on the owner
steps below.

### Building

_Nothing in progress._ Start the next spec from the [template](#template).

### Waiting on the owner

| Item                                                                                                                                                                                                          | From       | Done when                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| Phone acceptance of lesson sections: both entry points, the highlight, cards without a section, and the reader opened from the list                                                                           | 1b, 7      | Checklist passes on the converted demo deck          |
| Fresh Maestro run of all nine flows on a current release APK. `focus-resume`, `discover-hold-to-focus`, and `archived-progress-restart` have never run on a device; the last pass (five flows) was 2026-09-24 | 3, 5, 6, 7 | All flows green; commit and build recorded here      |
| Backup round trip between two clean installs                                                                                                                                                                  | 5          | Counts, due state, and a resumed card match          |
| Restore a backup made on the v7 build into the v8 build (`flashcard-reels-v8.db`)                                                                                                                             | 7          | Progress restored after installing the decks         |
| Release: replace every package under R2 `decks/` with its schema 4 version (dev is already migrated) and ship a new APK                                                                                       | 7          | Production portal serves schema 4; new APK installed |

Record each acceptance run as **date · commit · build · result** below.

_No runs recorded yet._

### Open decisions

1. **A bundled deck that fails to install blocks app start** (`initializeDatabase`).
   Recommendation: start anyway, report it, and retry on the next start.
2. **Thin services.** Keep pass-through services as the presentation/infrastructure boundary (the
   current choice), or expose ports through the dependency hooks and delete them.
3. **Roadmap.** Earlier specs cite roadmap items (2: update a deck without losing progress;
   7: knowledge model; 10: context and reading), but the roadmap itself isn't written down. Add it
   here as the backlog's ordering.

### Backlog

These are agreed directions without a spec yet. Each needs a spec before work starts.

- **Computed progress.** Derive card counts and last-studied times from review events, and remove
  `flashcard_progress` and aggregation. Benchmark first on the owner's phone: 5,000 cards and
  100,000 events, with counts under 50 ms.
- **Review timing.** Record when a card appeared, was revealed, and was rated on attempts and
  events; `reviewed_at` becomes `rated_at`.
- **Skip events.** A card committed without a rating writes a `flashcard_skip_events` row.
- **Lesson read events.** Mark as read and Mark as revisited, with deck progress created by a read.
- **Nested sections** through an optional `parentId` (new schema, no ID changes).
- **Deck Studio:** an editor that manages lesson and section identities.
- **Update notices:** telling installed apps that a deck has a newer revision.

## Done

The full text of finished specs is in Git. Each link opens the last version before this page
replaced them. Their lasting decisions are in [decisions](../decisions.md), and current behavior is
in the docs.

| #   | Spec                                                                                                                                          | Written    | Result                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| 0   | [Deck publish check](https://github.com/StoyanDimitrov0016/flashcard-reels/blob/ce4179b/docs/specs/0-deck-publish-check.md)                   | 2026-09-23 | `r2:push-decks` compares against R2 and blocks identity and revision mistakes.                                 |
| 1a  | [Study feeds with a Discover and Focus header](https://github.com/StoyanDimitrov0016/flashcard-reels/blob/ce4179b/docs/specs/1a-study-tab.md) | 2026-09-23 | One Study tab over both feeds; indicator header.                                                               |
| 1b  | [Reading tab and lessons](https://github.com/StoyanDimitrov0016/flashcard-reels/blob/ce4179b/docs/specs/1b-reading-tab.md)                    | 2026-09-23 | Lessons in packages and a Reading destination. Device acceptance pending.                                      |
| 2   | [Deck themes and theme selections](https://github.com/StoyanDimitrov0016/flashcard-reels/blob/ce4179b/docs/specs/2-deck-theme-selections.md)  | 2026-09-28 | Rename only.                                                                                                   |
| 3   | [Naming alignment](https://github.com/StoyanDimitrov0016/flashcard-reels/blob/ce4179b/docs/specs/3-naming-alignment.md)                       | 2026-09-28 | One vocabulary; every table has its own `id`. Its "end state" list is now the backlog.                         |
| 4   | [Lesson section references](https://github.com/StoyanDimitrov0016/flashcard-reels/blob/ce4179b/docs/specs/4-lesson-section-references.md)     | 2026-09-30 | Superseded by 7. Heading-derived sections were replaced, while card-to-section links and the reader remain.    |
| 5   | [Learner data completion](https://github.com/StoyanDimitrov0016/flashcard-reels/blob/ce4179b/docs/specs/5-learner-data-completion.md)         | 2026-09-30 | Preferences in SQLite, theme selections as learner data, `CHECK`s, recurrences at commit, learner-data backup. |
| 6   | [Deep modules and robustness](https://github.com/StoyanDimitrov0016/flashcard-reels/blob/ce4179b/docs/specs/6-deep-modules-and-robustness.md) | 2026-10-01 | One call per intent in the study module; typed expected failures; race fixes.                                  |
| 7   | [Lesson sections as entities](https://github.com/StoyanDimitrov0016/flashcard-reels/blob/ce4179b/docs/specs/7-lesson-sections-as-entities.md) | 2026-10-05 | Schema 4: flat sections in `deck.json`, `marked` validation, format owned by the contract. Release pending.    |

Implementation reviews and handoffs from these specs are in
[`docs/reviews` at ce4179b](https://github.com/StoyanDimitrov0016/flashcard-reels/tree/ce4179b/docs/reviews).

## How specs work

- A spec is written before the work starts. The owner decides the problem, the scope, the
  hard-to-reverse decisions, and the time budget. Agents may draft requirements and acceptance
  checks, but the owner approves them.
- Build one spec at a time. A spec changes at most one core decision, such as the deck format,
  learning history, or the study flow.
- Statuses: **Draft → Approved → Building → Acceptance → Done**. Keep the spec's file in
  `docs/specs/` and its row under [Building](#building) until it is done.
- When a spec is done: move its decisions to [decisions](../decisions.md) and its behavior into the
  relevant doc, add a row to [Done](#done) that links to its last commit, then delete the file.
  Don't commit implementation reports; summarize anything worth keeping in the pull request.
- Keep a spec under about 150 lines. If it needs step-by-step instructions for an agent, put them
  in the pull request or the session, not the spec.

## Template

Name the file `<number>-<slug>.md`.

```markdown
# <number> - <title>

Status: Draft

## Problem and value

Who has the problem, why it matters now, and which roadmap item it serves.

## Requirements

What the learner or owner can do or see. Then only the qualities that matter here: data safety,
offline use, compatibility, performance, privacy.

## Out of scope

## Hard-to-reverse decisions

What the owner signs off before work starts.

## Acceptance

The automated and device checks that close the spec.

## Time budget

What the work is worth. When it doesn't fit, cut scope instead of extending the budget.

## Open questions
```
