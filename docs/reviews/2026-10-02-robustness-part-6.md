# Part 6: deep study module

Branch: `refactor/deep-study-module`.

Signals: study 25 + feed 5 + settlement 2 public members → 6 + 2;
the 13 repository/clock pass-throughs → 0; controller members 17 → 8;
controller activation queues 1 → 0; pending-rating sets 1 → 0;
public materialization/activation/rating protocols 3 → 0.

The study coordinator exposes intents and typed snapshots. SQLite finds attempts
by session and position. It keeps no known-attempt cache or feed state in memory.
The internal session operations own one queue for activation, rating and commits.
Materialization uses a separate key in that queue map, after activation releases
its session key, so a slow extension does not delay rating persistence.
The materializer consumes session, reel, recurrence and transaction ports directly.
Composition exposes only the runtime and settlement consumer interfaces.

Plain activation persists position, visibility and attempt creation without
building a feed or replacing the controller's feed object. Recurrence consumption,
rating commits and extension may return snapshots. Extension failures remain
nonfatal; session end requests invalidation, and locked ratings retain their value
and toast. UI reveal, transferred Focus state and mounted ranges stay local.

Seven new SQLite/React tests protect plain activation and object identity, slow
extension versus rating, recoverable extension failure, and SQLite attempt lookup
across service instances, out-of-order rating responses, and recall loading during
activation. Both response regressions failed before the corrections. Existing assertions remain intact, including commit
ordering, bounded history, resets, backup, deletion and stale replacement.

Validation: mobile check and 460 tests pass; database check passes without migration
changes. Root dead-code, lint, typecheck and custom-rule checks pass. Root check's
format stage reports only the owner's `.vscode/settings.json` exception.

## Deviations

- The coordinator uses an internal `StudySessionOperations` collaborator for the
  existing lifecycle, aggregation and commit algorithms. It owns their shared
  queues; it is not exposed through application services. Lower-level interruption
  and chronology tests still exercise these algorithms directly, while screen
  intent tests use the new interface. Fixture controls for exact positions and
  recurrence consumption now use SQLite ports rather than public study queries.
- Two consumer intents (`resumeFocusedSession`, `settleForProgressBackup`) delegate
  to that internal collaborator. Thus the 13 targeted pass-throughs are gone, but
  the total public delegation count is 2, rather than the proposed 0. Keeping each
  lifecycle rule defined once preserves the existing Focus/backup behavior.
- `CardInput.loadedThroughReelPosition` preserves extension timing for the mounted
  window. `rateCard.expectedAttempt` preserves the fatal deleted-attempt invariant
  using the controller's bounded UI knowledge; service lookup still uses SQLite.
  No attempt IDs cross the consumer boundary.
- `useRecallSession` and `refreshOccurrences` became obsolete and were removed
  here, before Part 7. The recurrence helper became unused after orchestration
  moved into the service and was removed to keep the dead-code check passing.
