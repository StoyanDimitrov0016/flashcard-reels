export const DECK_SCHEMA_VERSION = 2;

export const DECK_SCHEMA_CONSTRAINTS = {
  minRevision: 1,
  minFlashcards: 1,
  maxFlashcards: 1_000,
  maxLessons: 200,
  minTextLength: 1,
} as const;

export const DECK_PACKAGE_LIMITS = {
  maxAudioFileBytes: 5 * 1024 * 1024,
  maxCompressedBytes: 64 * 1024 * 1024,
  maxManifestFileBytes: 8 * 1024 * 1024,
  maxLessonFileBytes: 256 * 1024,
  maxUncompressedBytes: 128 * 1024 * 1024,
} as const;
