# Progress backups

**Controls → Progress backup** exports and imports learning progress as one readable JSON file. The
file contains `deck_progress`, `flashcard_progress`, `flashcard_memory_states`, and
`review_events`. It excludes downloaded deck content, audio, deck appearance, app preferences,
and study/feed sessions. This is a whole-library backup and transfer format; import replaces all
local learning progress rather than merging histories.

The portable document has `format: "flashcard-reels-progress"`, `version: 1`, an `exportedAt`
timestamp, and arrays named for the four exported models. This version is independent of SQLite
table names and app version. Once a backup is exported, a future app update must either read its
version or explain that it cannot. Timestamps use UTC ISO strings with milliseconds because the
local database compares them as text. Backup files are unencrypted and can reveal deck titles
and review history.

## Export

Export completes any active Discover and Focus sessions, finalizes rated attempts, and drains all
remaining progress aggregation, including batches below the usual threshold. It then reads the
four progress tables in one SQLite transaction and opens the device share sheet for the JSON
file. The screen refreshes its study state when the operation finishes, including when sharing
fails after sessions have already closed.

## Import

The file picker copies a selected file to cache. The app bounds its size, parses and validates
the entire document, and previews the incoming and local finalized review counts before any
learning data changes. Confirmation completes active sessions and aggregation, saves the current
progress as `progress-backups/before-last-progress-restore.json` in app documents, and replaces
the progress tables in one SQLite transaction. The previous copy can be shared from the same
screen. Full app-data reset deletes it.

Downloaded decks stay installed. Imported progress for installed deck IDs becomes active
immediately, using the installed deck's current title and package version. Imported progress for
deck IDs absent from the device is archived, regardless of its former resolution. Stable
flashcard IDs preserve state across package versions; progress for cards absent from an installed
package remains stored. A later deck reinstall follows the existing archived-progress choice.

Import deletes local study sessions and their provisional attempts, feed items, and recurrences
so they cannot alter the restored progress. The confirmation does not remove decks, audio,
appearance, or preferences. An invalid file or failed SQLite transaction leaves local progress
unchanged. The automatic safety copy is made before the replacement transaction and remains
available after a failed restore.
