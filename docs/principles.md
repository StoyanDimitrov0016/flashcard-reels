# Principles

These principles settle trade-offs. When a change conflicts with one, change the principle
deliberately in a spec; don't erode it quietly in code.

## Product

1. **Recall first, feed second.** The feed sets the pace; active recall is the point. FSRS is the
   memory model, and the reel feed is the experience. Don't turn the app into a daily review queue
   just because the scheduler exposes due dates.
2. **Local-first.** Studying works with no account, network, portal, or cloud service. The portal
   adds distribution and convenience, and the mobile app never depends on it.
3. **One learner state, many views.** Discover and Focus are two scopes over the same learner state
   and the same learning engine. They never become separate schedulers.
4. **Learning history is sacred.** A committed review is durable. Removing, updating, or restoring
   a deck never silently loses it; only an explicit reset deletes history. Bounded, compactable
   state such as feed windows stays separate from durable history.
5. **Identity carries learning.** Stable deck, card, lesson, and section IDs preserve learning
   across deck updates. A card that teaches something substantially different gets a new ID.
6. **Content and learner data are separate.** Deck packages own content. The app owns progress,
   preferences, and theme selections. A deck's theme is the learner's choice, never package content.
7. **Gestures have one meaning.** Horizontal swipes move between destinations, vertical swipes move
   through cards, and holding a Discover card enters Focus without losing the study moment.
8. **Optional depth never gates.** Reading and audio enrich study, but they never block it or
   create obligations.
9. **No speculative systems.** Accounts, sync, marketplaces, and social features wait until a spec
   asks for them.

## Engineering

1. **Untrusted input converges on one gate.** Every `.fcrdeck`, whether a file, a QR download,
   the bundled demo, or a portal read, is validated by `@flashcard-reels/deck-contract` before
   anything uses it. Parsed content is then trusted without another check.
2. **Validate completely, then write.** Imports and restores finish all validation before the first
   write and apply changes in one transaction. A failure leaves existing data unchanged.
3. **Deep modules.** A module's interface is much smaller than what it hides. Each caller intent is
   one call; callers don't run multi-step protocols, and each decision lives in one place.
4. **Dependencies point inward.** Domain depends on nothing app-specific; presentation never reaches
   into infrastructure. The [architecture](architecture.md#mobile-layers) has the exact matrix,
   and lint enforces the import-level rules.
5. **Expected failures are typed and recoverable.** A locked rating, an expired QR code, or an
   invalid package is a typed error with a clear message, not a crash. Programming errors still
   propagate.
6. **Secrets stay on the server.** R2 stays private. Credentials and signing secrets never reach a
   client bundle, and transfer URLs are short-lived.
7. **Phase 0 has no migrations.** Until the first real release, schema changes regenerate one
   `0000` baseline under a new database name. Progress moves between development builds through
   backup restore.
8. **Prefer the platform and the library.** Use TanStack Query for data, Drizzle for SQL, and
   `marked` for Markdown before writing your own. Don't hand-roll caching, parsing, or rendering
   that a dependency already does well.
9. **Follow the code that is already there.** An established pattern beats a new one that fits
   equally well. See [conventions](conventions.md).

## Testing

1. **Test what a user or another system would notice:** visible outcomes, durable data invariants,
   failure recovery, and boundaries that can corrupt or lose data.
2. **Real where it matters.** Integration tests use real SQLite, filesystem, and services, and
   replace only native or external boundaries. Never rebuild the study system as an in-memory fake.
3. **Don't test the library.** Test what the app decides, not how TanStack Query caches or how FSRS
   computes intervals.
4. **Ask which bug would make the test fail.** If the only answer is a rename, rewrite the test or
   delete it.
5. **Native behavior needs a device.** Gestures, sheets, background and resume, and release builds
   are checked by Maestro flows and on a phone. Tests in jsdom can't prove them.
