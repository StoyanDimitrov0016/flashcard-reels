# Learning engine

The learning engine is a deep internal module. It decides memory-aware feed order without owning React, navigation, deck persistence, SQLite construction, flashcard content, or study-session lifecycle.

- Flashcard IDs identify stable content records.
- Review attempts are the historical events. Their rating remains editable until finalization.
- Learner profiles aggregate finalized ratings for reporting and progress views.
- Flashcard memory states store the application-owned FSRS scheduler state separately from profile statistics.
- The last five reel positions remain editable. A swipe without a rating is an unrated attempt, finalized as a skip.
- FSRS is applied exactly once when a rated attempt is finalized, using the attempt's `ratedAt` timestamp. Unrated finalized attempts do not create memory state.
- The editable tail is provisional: immediate `Again` and `Hard` recurrence reacts to provisional ratings, while FSRS waits for finalization.
- Repeated reviews for one flashcard are applied exactly once in ascending final `ratedAt` order across the whole session, with reel position and attempt ID as deterministic tie-breakers. A review is deferred if an earlier same-card rating is still unfinalized.
- Finalization work is serialized per study session. Session completion uses the same global ordering as rolling finalization.
- Skips do not create recurrence, memory state, or learner-profile review counts. A skipped attempt can still become rated while it remains editable.
- Immediate `Again` and `Hard` recurrences remain session/feed reservations. They do not derive their positions from long-term FSRS due dates.
- The scheduler adapter uses `ts-fsrs` with `enable_short_term: false`, `enable_fuzz: false`, and the library's default retention and maximum interval.
- Discover and Focus share the same feed composer. Discover supplies active cards from all active decks; Focus supplies active cards from one deck.
- The composer uses simple due/retrievability pressure, new-card, and low-pressure groups. It checks recency across all groups before relaxing it, then uses injected randomness within the selected group. It does not use learner-profile counters.
- Study sessions still materialize a bounded future window. Memory updates, recurrence consumption, and finalization complete before a new feed chunk is materialized.
- Recent-card state tracks actual visible appearances, including normal materialization, recurrence, and anchor cards. Pre-materialization alone does not count as an appearance.

## Verification boundaries

- Pure scheduler and composer behavior lives under `tests/unit` and `tests/behavior` and does not open SQLite.
- SQLite-backed application and persistence flows live under `tests/integration`; the former scenario test is named as an integration test.
- `tests/support` contains shared clocks, repositories, and SQLite fixture construction. Application fixtures use Drizzle; raw SQL is reserved for schema, migration, constraint, trigger, and aggregate-query assertions.
- `E2E` is reserved for device-level user-visible tests. SQLite service tests are integration tests.
