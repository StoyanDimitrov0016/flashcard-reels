export const DECK_PACKAGE_LIMITS = Object.freeze({
  maximumAudioFileBytes: 5 * 1024 * 1024,
  maximumAudioFileCount: 2_000,
  maximumCardCount: 1_000,
  maximumCompressedBytes: 64 * 1024 * 1024,
  maximumUncompressedBytes: 128 * 1024 * 1024,
});

export class DeckPackageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckPackageValidationError";
  }
}

export function validateCompressedPackageSize(size: number): void {
  if (size > DECK_PACKAGE_LIMITS.maximumCompressedBytes) {
    throw new DeckPackageValidationError(
      `Compressed package size ${size} exceeds limit ${DECK_PACKAGE_LIMITS.maximumCompressedBytes}`
    );
  }
}

export function validateUncompressedPackageSize(size: number): void {
  if (size > DECK_PACKAGE_LIMITS.maximumUncompressedBytes) {
    throw new DeckPackageValidationError(
      `Uncompressed package size ${size} exceeds limit ${DECK_PACKAGE_LIMITS.maximumUncompressedBytes}`
    );
  }
}

export function validateCardCount(count: number): void {
  if (count > DECK_PACKAGE_LIMITS.maximumCardCount) {
    throw new DeckPackageValidationError(
      `Card count ${count} exceeds limit ${DECK_PACKAGE_LIMITS.maximumCardCount}`
    );
  }
}

export function validateAudioResources(count: number, individualSizes: Iterable<number>): void {
  if (count > DECK_PACKAGE_LIMITS.maximumAudioFileCount) {
    throw new DeckPackageValidationError(
      `Audio file count ${count} exceeds limit ${DECK_PACKAGE_LIMITS.maximumAudioFileCount}`
    );
  }
  for (const size of individualSizes) {
    if (size > DECK_PACKAGE_LIMITS.maximumAudioFileBytes) {
      throw new DeckPackageValidationError(
        `Audio file size ${size} exceeds limit ${DECK_PACKAGE_LIMITS.maximumAudioFileBytes}`
      );
    }
  }
}
