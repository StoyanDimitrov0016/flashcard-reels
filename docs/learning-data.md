# Learning data

Deck content comes and goes with packages. Learning data belongs to the learner and outlives it.
This page describes how learning data is kept, archived, reset, backed up, and restored.

## What counts as learning data

| Table                     | Holds                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `review_events`           | Every finalized rating.                                                               |
| `flashcard_progress`      | Per-card review counts and dates.                                                     |
| `flashcard_memory_states` | Per-card FSRS scheduling state.                                                       |
| `deck_progress`           | Per-deck title, revision, last review, and state: `active`, `archived`, or `pending`. |

These tables key on stable deck and card IDs and have no cascading foreign keys to deck content.
Provisional review attempts are session data. They are finalized, and progress aggregation is
drained, before any operation below changes learning data.

## Archive and reinstall

- The first finalized rating in a deck creates its `deck_progress` row.
- Removing a studied deck deletes its cards, lessons, audio, and session references, and marks
  its progress `archived`. Removing an unstudied deck leaves nothing behind.
- Installing a package with an archived deck's ID marks it `pending`. Its cards stay out of the
  feeds until the learner chooses **Continue** or **Start fresh**.
- Start fresh, deleting an archive, and resetting everything each remove the affected review
  events, summaries, FSRS state, and deck record in one transaction.
- Progress for card IDs missing from the current package is kept for a later revision. A deck
  reset clears it too, so no hidden progress remains.
- The archive screen shows an estimated size of the learning rows only, not cards or audio.

A substantial change to what a card teaches needs a new card ID.

## Backup format

A backup is one readable JSON file:

```json
{
  "format": "flashcard-reels-progress",
  "version": 1,
  "exportedAt": "2026-09-28T10:00:00.000Z",
  "deckProgress": [],
  "flashcardProgress": [],
  "flashcardMemoryStates": [],
  "reviewEvents": []
}
```

It contains all four learning tables and nothing else: no deck content, audio, appearance,
preferences, or sessions. Timestamps are UTC ISO strings with milliseconds, because SQLite
compares them as text. The file is unencrypted and reveals deck titles and review history.

The format version is independent of table names and app version. Until Phase 0 closes, the
format changes directly. After that, every app version must read older backups or explain
why it cannot.

## Export

Export completes active Discover and Focus sessions, finalizes rated attempts, drains all
aggregation, reads the four tables in one transaction, and opens the share sheet. Study state
refreshes afterwards, even if sharing fails.

## Import

1. The picked file is copied to cache, size-bounded, parsed, and fully validated. Validation
   rejects unsupported versions, duplicate IDs, cards owned by two decks, review history
   without deck progress, and review events that disagree with their card's counts or dates.
2. A preview shows incoming and local review counts. Nothing has changed yet.
3. On confirmation, the app completes active sessions, saves current progress as a safety copy
   in `progress-backups/`, and replaces the four tables in one transaction. Study sessions are
   deleted so they cannot alter the restored data.
4. Installed decks become `active` with their imported progress. Decks absent from the device
   become `archived` and follow the normal reinstall choice.

Invalid files and failed transactions leave progress unchanged. Importing the same document
again is a no-op. The safety copy can be shared from the same screen; a full app data reset
deletes it. Decks, audio, appearance, and preferences are never touched.
