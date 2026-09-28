# 2 - Deck themes and deck theme selections

Status: ready for owner review. A rename with no change in behavior.

## Problem and value

The app calls two different things "appearance": the app-wide light, dark, or device setting,
and the color preset a learner picks for each deck. The deck side also mixes two ideas under one
name: the curated presets, which are app design defined in code, and the learner's choice of
preset for a deck, which is data in the database. A table named `deck_appearances` reads as if
it held colors, but it only holds that choice.

Splitting the names makes the model readable before more per-deck choices are added:

- A **deck theme** is one of the curated presets defined in code, such as `gold` or `rose`,
  each with a light and a dark variant.
- A **deck theme selection** is the learner's choice of theme for one deck, stored in the
  database.

## Functional requirements

1. The learner sees "Theme" wherever the UI talks about a deck's colors today, including
   accessibility labels. Everything else looks and behaves exactly as before.
2. A deck's chosen theme is kept across app restarts, exactly as today.

## Non-functional requirements

- **No behavior change.** This is a pure rename. Everything below keeps working exactly as it
  does today, under the new names:
  - Removing a deck still removes its selection. The removal transaction
    (`sqlite-deck-removal.transaction.ts`) keeps its explicit delete, pointed at
    `deck_theme_selections`, and the foreign key keeps its cascade.
  - Reading a selection whose stored theme the app does not define still throws, as the
    repository's `toModel` does today.
  - Backups still exclude selections.

## Implementation

### Code: deck themes

Rename the deck-appearance presets to deck themes in `apps/mobile/src`:

| Now                                                                          | New                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------- |
| `features/decks/presentation/deck-appearance-presets.ts`                     | `deck-theme-presets.ts`                     |
| `DeckAppearancePreset`, `DeckAppearancePresetId`, `isDeckAppearancePresetId` | `DeckTheme`, `DeckThemeId`, `isDeckThemeId` |
| `deckAppearancePresets`                                                      | `deckThemes`                                |

### Database and code: deck theme selections

Rename the stored choice to deck theme selections:

| Now                                                                                                 | New                                                                                                                |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| table `deck_appearances`                                                                            | `deck_theme_selections`                                                                                            |
| column `preset_id`                                                                                  | `theme`                                                                                                            |
| primary key `deck_id`                                                                               | own `id` primary key (UUID text); `deck_id` becomes `UNIQUE`, still referencing `decks` with cascade               |
| `deck-appearance.model.ts`, `deck-appearance.repository.ts`, `sqlite-deck-appearance.repository.ts` | `deck-theme-selection.model.ts`, `deck-theme-selection.repository.ts`, `sqlite-deck-theme-selection.repository.ts` |
| `DeckAppearance…` types, services, contexts, hooks, components, and tests                           | `DeckThemeSelection…` for the stored choice, `DeckTheme…` for the presets                                          |

Follow the table-naming rule: every table has its own `id`, and a column pointing at another
table's row is `<resource>_id`. `theme` has no database `CHECK`, because the list of themes can
change between app versions.

### Migration

Regenerate the single `0000` baseline instead of adding a migration, as `docs/development.md`
asks for Phase 0. This also avoids Drizzle's interactive rename prompt.

1. Delete `apps/mobile/drizzle/0000_*.sql`, `0001_*.sql`, `0002_*.sql`, and the files in
   `apps/mobile/drizzle/meta`.
2. From `apps/mobile`, run `npx drizzle-kit generate`. Keep `drizzle/migrations.js` in the
   repository's style: double quotes, trailing commas.
3. In `src/infrastructure/sqlite/database.ts`, rename `DATABASE_NAME` to
   `flashcard-reels-v3.db`, so existing development installs start with a fresh database.
4. In `src/infrastructure/app-recovery.ts`, add `flashcard-reels-v3.db` to `DATABASE_FILES`,
   and add it to the matching test in `tests/unit/app-recovery.test.ts`.
5. Remove any test that only exercised the old migration chain.

### Not in scope

- The app-wide light, dark, or device setting keeps its current name, `appearance`, in the
  preferences feature. Do not rename it.
- Keeping a deck's theme after removal, including it in backups, and any other data-model change
  from the Phase 0 drafts.
- New themes or custom colors.
- Falling back to the default theme for an unknown stored theme. That is a separate change.

## Hard-to-reverse decisions

1. The names **deck theme** (a preset in code) and **deck theme selection** (the stored choice).
2. `deck_theme_selections` has its own `id`, and `theme` stores a theme name without a `CHECK`.

## Acceptance

1. Searching `apps/mobile/src` and `apps/mobile/tests` for `DeckAppearance`, `deckAppearance`,
   `deck_appearances`, `deck-appearance`, and `preset_id` finds nothing.
2. The preferences feature's `appearance` setting is unchanged.
3. `apps/mobile/drizzle` holds one `0000` migration, and `npm run db:check` passes in
   `apps/mobile`.
4. A test stores a theme for a deck and reads it back. Removing the deck removes its selection.
5. `npm run check` and `npm test` pass in `apps/mobile`.
6. On a device, the deck theme sheet still changes a deck's colors, and the choice survives an app
   restart.

## Time budget

One evening.

## Open questions

None.
