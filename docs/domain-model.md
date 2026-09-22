# Domain model guide

Use **domain model** as the umbrella term for concepts the app represents and
the rules around them. A model is an **entity** when its identity remains stable
while its attributes change. For example, a `Flashcard` keeps its ID when its
question or answer is updated. A value that is defined by its attributes and has
no independent identity is not an entity.

In code, use the specific domain name for persisted concepts. UI code may call a
flashcard a “card” when the shorter wording reads naturally, but persisted model
and API names use `Flashcard` so they stay distinct from package fields such as
`cards`.

## Canonical models

| Model | Persistence | Meaning |
| --- | --- | --- |
| `Deck` | `decks` | Installed package content and its stable identity. |
| `Flashcard` | `flashcards` | A deck's question and answer content, identified by a stable flashcard ID. |
| `FlashcardProgress` | `flashcard_progress` | Learner-facing review counts and timestamps, including the reset boundary. |
| `FlashcardMemoryState` | `flashcard_memory_states` | The current FSRS scheduling state for a flashcard. |
| `FlashcardReviewAttempt` | `flashcard_review_attempts` | A provisional review in a study session; it can still be changed before finalization. |
| `ReviewEvent` | `review_events` | A finalized, durable review record. |
| `DeckProgress` | `deck_progress` | Saved learning data for a deck whose content is no longer installed, and its archive or continuation status. |
| `StudySession` | `study_sessions` | A learner's study/feed session and its persisted position and lifecycle. |

Deck packages own `Deck` and `Flashcard` content. The app owns progress,
memory state, attempts, finalized review events, and study sessions. Removing
deck content can therefore preserve learning state under the stable deck and
flashcard IDs. `FlashcardProgress` and `FlashcardMemoryState` describe different
things: the first supports progress summaries and reset behavior; the second
drives scheduling.

An attempt is provisional while a session is active. Finalization turns a rated
attempt into a durable `ReviewEvent` and updates `FlashcardMemoryState`;
aggregation updates `FlashcardProgress` from finalized attempts. Keep those
stages distinct when naming APIs, queries, and persistence operations.

Repositories provide routine access to one model's table. Give combined reads
that join multiple models a query type named for the result or use case. Put
atomic writes across tables in a transaction type named for the operation.
Application services coordinate those queries and transactions.
