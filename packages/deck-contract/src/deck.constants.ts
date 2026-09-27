export const DECK_SCHEMA_VERSION = 1;

export const DECK_CONSTRAINTS = {
  minimumRevision: 1,
  minimumFlashcards: 1,
  maximumFlashcards: 1_000,
  maximumLessons: 200,
  minimumTextLength: 1,
} as const;
