# Learning engine

The learning engine orders study cards using review history, short-term recall pressure, new-card availability, and recent-card variety. Discover supplies cards from all active decks; Focus limits the same composer to one deck.

Ratings affect the current session immediately, while finalized reviews update the long-term FSRS memory state and Progress summaries. Skips remain history-free until a card is actually rated. Review history remains durable even when old feed material is compacted.

The engine keeps study sessions open-ended, preserves the furthest reviewed position, and prevents backwards navigation from reopening completed work. Its policies are isolated from React, navigation, SQLite construction, and deck persistence.

Unit tests cover scheduling and feed decisions; integration tests cover their interaction with real sessions and storage.
