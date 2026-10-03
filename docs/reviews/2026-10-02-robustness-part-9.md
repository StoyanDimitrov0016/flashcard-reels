# Part 9: final review follow-ups

Branch: `fix/robustness-final-followups`, from `chore/names-and-dead-members`.

## Signals

| Item                                                                   | Before | After                     |
| ---------------------------------------------------------------------- | ------ | ------------------------- |
| Snapshot application paths gated by the latest issued request          | 3      | 0; one last-applied guard |
| Snapshots for a new Good rating without recurrence changes             | 1      | 0                         |
| Snapshots for activation committing Good without consumption/extension | 1      | 0                         |
| Study imports from reels                                               | 4      | 0                         |
| Reels modules outside presentation                                     | 6      | 0                         |
| Files beginning with a UTF-8 BOM                                       | 10     | 0                         |
| Malformed arrows in the Part 7 report                                  | 6      | 0                         |

The controller still issues request numbers, but only an applied feed snapshot
advances its snapshot guard. Plain activations and ratings leave pending snapshots
eligible. Per-card rating sequencing prevents an older snapshot from replacing a
newer saved rating, and lifetime cleanup still rejects obsolete snapshots.

The recurrence decision comes from the existing configuration in
`study/domain/recurrences.ts`. Rating returns the saved value independently of an
optional snapshot, preserving locked ratings and their toast. Previous or new
recurring ratings still refresh; consuming or committing recurring attempts and
successful conditional extensions still supply snapshots. Good/Easy updates that
change no recurrence update recall without rebuilding the feed.

Feed materialization, extension policies, prepared feed types, engine settings,
and the persisted feed-state contract now live in study. Composition and tests
use `FeedMaterializer`; reels contains only presentation. No SQL, dependency,
web workspace, or JSX layout changes were made.

Five new SQLite/React regression tests all failed before the fixes and pass after:
the extension surviving a newer plain activation, Good preserving mounted feed
identity, Good rating without refresh, Good commit without refresh, and recurrence
addition/removal retaining refresh. Existing assertions remain intact.

Validation: mobile check and 472 tests pass. Root check, all 543 tests
(472 mobile, 40 web, 31 deck-contract), and dead-code check pass. Database and
bundled-deck checks pass, with no migration diff. The owner's settings edit is
excluded from the commit.

## Deviations

- `study/contracts/feed-state.schema.ts:1`: moved the reels contract too, beyond
  the five application/domain files named in the review. Leaving it in reels
  would violate the required one-way dependency and presentation-only structure.
- `study/domain/study.service.ts:40`: the nullable snapshot result includes a saved
  `rating` field so callers preserve locked values without rebuilding a feed.
- `use-reel-controller.ts:294`: non-snapshot failure/toast guards retain their
  latest-request checks; only snapshot application follows the last-applied rule.
  Rating merging also keeps newer per-card results when an older snapshot applies.

Nothing deferred. The two public delegations, specialized loaders, and qualified
names listed by the review remain.
