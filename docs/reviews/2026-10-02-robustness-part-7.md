# Part 7: queries that fit callers

Branch: `refactor/use-case-services`.

Signals: DeckService members 7 â†’ 6; pass-throughs 6 â†’ 2;
screen query protocols 3 â†’ 0; duplicated eligible load lifecycles 8 â†’ 1 shared
definition, consumed by 7 hooks; optional settlement inputs 1 â†’ 0;
obsolete deck loader hooks 2 â†’ 0. The dead feed member was already removed in Part 6.

Queries live in DeckService because deck, appearance and available-card data form
the three existing caller needs. It takes the flashcard repository for catalog
counts and availability port for details, preserving pending-progress exclusion.
The two remaining thin members are deck lookup for Focus and saving learner themes.
The unused FlashcardService count member is removed; its repository count stays.

`useAsyncLoad` owns load lifetime, ignores cancelled/superseded results, and keeps
data/error/loading and explicit refresh. Callers choose error wording, immediate
loading gates, and whether manual refresh shows loading. Existing render-time
errors stay at the caller boundary. `useDeckMetadata` replaces both reel metadata
loads. Lesson views use it for themes while allowing retained appearance after
deck removal; no JSX layout changes are made.

New tests protect stale load replacement, retry after failure, disabled loading,
inactive-card counts, pending-progress availability, removed-deck appearance, and
missing catalog appearance. Existing detail-loading and persistence assertions
remain, adapted to the new query and load-state shapes.

Validation: mobile check and 467 tests pass; root dead-code, custom rules, lint and
typecheck pass. Root check reports only the owner's `.vscode/settings.json` format
exception. Database and deck checks pass; migration files are unchanged.

## Deviations and loaders kept

- There are 13 listed live load sites at the start of Part 7, since Part 6 removed
  `useRecallSession`. Eight fit the generic lifecycle; collection and themes merge
  into one consumer. The other five retain their specialized behavior:
  - `useImportDeckSheet`: permission refresh is an event subscription inside a
    camera/scan session, not a request returning screen data.
  - `deck-lessons-context`: failure reports and retains its previous map, with no
    loading/error view; its lesson sheet lifetime is independent of data loading.
  - `preferences-context`: defaults, readiness, optimistic edits and serialized
    writes share mutable state; a generic request result would overwrite edits.
  - `useProgressBackupController`: initial safety-copy availability is nonfatal
    and subsequent restores edit the same state; it is not a screen load result.
  - `usePreparedReelFeed`: request identity deliberately shares a non-idempotent
    session-opening promise across StrictMode replay and gates old content during
    render. The generic hook does not own that session lifetime.
- `findWithThemes` returns nullable decks with retained theme selections. This
  preserves existing theme-only lesson callers and progress rows that skip missing
  decks. The reel metadata hook still requires every requested deck and theme.
- Theme persistence assertions now read the theme through `getDetails`; they also
  continue checking the raw row and untouched deck content.
