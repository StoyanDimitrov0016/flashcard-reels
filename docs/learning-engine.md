# Learning engine

The learning engine is a deep internal module. It decides memory-aware feed order without owning React, navigation, deck persistence, SQLite construction, flashcard content, or study-session lifecycle.

- Flashcard IDs identify stable content records.
- Review attempts are the historical events. Their rating remains editable until finalization.
- Learner profiles aggregate finalized ratings for reporting and progress views.
- Flashcard memory states store the application-owned FSRS scheduler state separately from profile statistics.
- The editable review tail is the last five positions relative to the session's furthest viewed position. A swipe without a rating is an unrated attempt, finalized as a skip.
- FSRS is applied exactly once when a rated attempt is finalized, using the attempt's `ratedAt` timestamp. Unrated finalized attempts do not create memory state.
- The editable tail is provisional: immediate `Again` and `Hard` recurrence reacts to provisional ratings, while FSRS waits for finalization.
- Repeated reviews for one flashcard are applied exactly once in ascending final `ratedAt` order across the whole session, with reel position and attempt ID as deterministic tie-breakers. A review is deferred if an earlier same-card rating is still unfinalized.
- Finalization work is serialized per study session. Session completion uses the same global ordering as rolling finalization.
- Skips do not create recurrence, memory state, or learner-profile review counts. A skipped attempt can still become rated while it remains editable.
- Immediate `Again` and `Hard` recurrences remain session/feed reservations. They do not derive their positions from long-term FSRS due dates.
- The scheduler adapter uses `ts-fsrs` with `enable_short_term: false`, `enable_fuzz: false`, and the library's default retention and maximum interval.
- Discover and Focus share the same feed composer. Discover supplies active cards from all active decks; Focus supplies active cards from one deck.
- The composer uses simple due/retrievability pressure, new-card, and low-pressure groups. It checks recency across all groups before relaxing it, then uses injected randomness within the selected group. It does not use learner-profile counters.
- Study sessions still materialize a bounded future window, keep mounted occurrence state and recall-session maps bounded, and compact old runtime materialization rows as the furthest position advances. Memory updates, recurrence consumption, and finalization complete before a new feed chunk is materialized.
- Moving backwards changes the current position but not the furthest-position checkpoint, so finalized reviews cannot become editable again. Review attempts remain durable after runtime feed rows are compacted.
- Recent-card state tracks actual visible appearances, including normal materialization, recurrence, and anchor cards. Pre-materialization alone does not count as an appearance.

## Verification boundaries

- Pure scheduler, composer, and policy behavior lives under `tests/unit` and does not open SQLite.
- SQLite-backed application, session, FSRS, aggregation, package, and filesystem flows live under `tests/integration`.
- `tests/support` contains deterministic fixtures and real SQLite graph construction, not alternate repositories or study behavior.
- Static public-module and runtime-resource contracts live under `tests/architecture`.
- Native gestures and presentation are verified with the manual device checklist.
