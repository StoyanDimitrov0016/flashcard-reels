# Mobile app guide

This workspace is the local-first learning client. Core studying must remain usable
without an account, network connection, web portal, or cloud service.

## Product invariants

- Discovery and Focus are two scopes over the same learner state and learning
  engine. They must not become separate schedulers.
- FSRS is the memory model; the reel feed is the user experience. Do not reshape
  the product into a traditional daily-review queue just because the scheduler
  exposes due dates.
- Horizontal swipes move between primary app destinations; vertical swipes move
  through reels. Holding a Discover reel enters Focus while preserving the current
  study moment.
- Recent review state is provisional; finalized review attempts are durable
  learning history. Keep long-running presentation/feed state bounded without
  compacting durable review history.
- Stable deck and card IDs preserve learning identity across deck updates.
  Deck appearance is app/user state, not package content.
- Treat imported `.fcrdeck` files as untrusted input. All install/update paths
  must converge on the validated package-installer boundary.

## Architecture

- Keep routes and application composition in `src/app`.
- Keep feature code in `src/features`; infrastructure adapters belong in the
  feature's infrastructure layer or shared `src/infrastructure`.
- Do not leak Expo, SQLite, filesystem, or archive details into public
  domain/application APIs.
- Preserve the distinction between current reel position and monotonic furthest
  reel position; commit/finalization semantics depend on it.
- Treat `drizzle/` as generated output from
  `src/infrastructure/sqlite/schema.ts`. Phase 0 uses one canonical database
  baseline rather than compatibility migrations for discarded development
  schemas.

## Testing and native behavior

- Pure deterministic policies belong in unit tests. Persistence, session
  lifecycle, FSRS, recurrence, finalization, reset, and compaction behavior should
  use the real SQLite-backed integration graph.
- Do not recreate the study system as a large in-memory behavioral fake.
- Actual gestures, native presentation, background/resume behavior, and release
  builds remain part of the device smoke-test boundary.
