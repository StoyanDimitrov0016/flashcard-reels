# Decisions

Hard-to-reverse choices, with their reasons. Add an entry when a spec's owner signs off a decision.
Replace an entry, rather than editing history into it, when a decision changes. The source spec
for each entry is in the [specs archive](specs/README.md#done).

## Product and vocabulary

- **One vocabulary everywhere** (spec 3). Code, database, and UI say _Rating_ (Again, Hard, Good,
  Easy), _commit_, _Discover_ and _Focus_, _study island_, _color mode_, _flashcard audio_, and
  _Settings_. "Controls" names UI controls only. Persisted names say `Flashcard`; UI copy may say
  "card".
- **Deck theme vs. deck theme selection** (spec 2). A _deck theme_ is a curated preset in code with
  light and dark variants. A _deck theme selection_ is the learner's stored choice. App-wide light
  and dark is _color mode_.
- **The feed header is an indicator, not a control** (spec 1a). Swiping is the navigation gesture.
  The Study bottom item covers both Discover and Focus.
- **Lessons are deck content** (spec 1b). They install, update, and uninstall with their deck, and
  create no learner data. A pending deck still shows its lessons.

## Deck format

- **Schema 4 only** (spec 7). Readers reject every other schema with `UnsupportedDeckSchemaError`.
  There are no users to keep compatible, and a new number makes older readers fail cleanly instead
  of misreading.
- **Sections are flat entities** (spec 7). A lesson is an optional intro plus ordered sections.
  Their IDs, titles, and order live in `deck.json`, and each body is its own Markdown file. No code
  infers structure from Markdown. Nesting can come later through an optional `parentId` without
  changing any ID.
- **A restricted Markdown subset** (spec 7): paragraphs, lists, code, bold, italic, and line breaks.
  Adding syntax is easy; removing it breaks content. The contract validates with the same `marked`
  version that `react-native-marked` renders with.
- **No stored combined lesson document** (spec 7). A second copy would become a second source of
  truth.
- **Array position is order.** Cards, lessons, and sections have no `order` field.
- **Curated decks live in R2, not Git** (spec 7). Published packages are their source of record. Git
  holds only the demo deck and test fixtures.

## Publishing

- **The publish check fails closed** (spec 0). If R2 can't be read or a published package can't be
  parsed, nothing uploads. It compares decoded content, not archive bytes.
- **Only the owner confirms an upload** (spec 0). An agent may run the check and show the report,
  but must never type the confirmation.
- **`DECK_PREFIX` has no default** (spec 7). A missing value must not quietly select production.
  The publisher takes an explicit `--environment` and never infers it from the portal.

## Data

- **Every table has its own `id`.** A column that references another table is `<resource>_id`
  (spec 3).
- **Learner data has no foreign keys to content** (specs 5, 7). Progress, memory state, review
  events, deck progress, theme selections, and preferences survive deck removal under stable IDs.
- **Preferences live in SQLite** (spec 5), in one checked `learner_preferences` row, so backups and
  checks cover them. The key-value store is gone.
- **Theme selections are learner data** (spec 5). They are kept when a deck is removed and included
  in backups, and an unknown stored theme falls back to the default. `theme` has no `CHECK`
  because the list changes between app versions.
- **Every column with a fixed set of values has a `CHECK`** (spec 5), except where the set is
  versioned in code, as with `theme`.
- **Recurrences are created at commit** (spec 5), never from a rating that can still change.
- **`has_audio` comes from the package** (spec 5). The app doesn't probe for files.
- **Backups contain no table IDs** except on review events (spec 3). Restore generates them.
- **Phase 0 database policy.** Until the first real release, schema changes regenerate the single
  `0000` baseline and rename the database (currently `flashcard-reels-v8.db`). There are no
  migrations; progress moves through backup restore keyed by card ID.

## Code

- **Deep modules, thin services kept** (spec 6). Each caller intent is one call. Pass-through
  services stay as the only boundary between presentation and infrastructure until a spec decides
  otherwise.
- **TanStack Query for all app data,** including local SQLite reads and writes, so loading,
  invalidation, and races are handled once.
- **React Compiler handles memoization.** `useMemo` is banned by lint.
- **Custom errors delegate their name to a shared constructor,** so `unicorn/custom-error-definition`
  is off. Runtime error-contract tests check names, inheritance, codes, and causes instead.
- **Tailwind on the web, tokens framework-neutral.** shadcn/ui is distributed for Tailwind, but the
  palette is plain TypeScript and CSS variables, so the styling layer can change without moving
  colors.
- **Expo SDK pins mobile native versions.** Update them with `npx expo install --check` from
  `apps/mobile`, not to npm `latest`. All workspaces share the `@types/react` version pinned by
  Expo; a second copy breaks the web type check through hoisted libraries.
