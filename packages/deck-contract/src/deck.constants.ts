export const DECK_SCHEMA_VERSION = 1;

export const DECK_SCHEMA_CONSTRAINTS = {
  minRevision: 1,
  minFlashcards: 1,
  maxFlashcards: 1_000,
  maxLessons: 200,
  minTextLength: 1,
} as const;
