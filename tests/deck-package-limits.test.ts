import { describe, expect, it } from "vitest";

import {
  DECK_PACKAGE_LIMITS,
  validateAudioResources,
  validateCardCount,
  validateCompressedPackageSize,
  validateUncompressedPackageSize,
} from "@/features/decks/domain/deck-package-limits";

describe("deck package resource limits", () => {
  it.each([
    ["compressed size", validateCompressedPackageSize, DECK_PACKAGE_LIMITS.maximumCompressedBytes],
    [
      "uncompressed size",
      validateUncompressedPackageSize,
      DECK_PACKAGE_LIMITS.maximumUncompressedBytes,
    ],
    ["card count", validateCardCount, DECK_PACKAGE_LIMITS.maximumCardCount],
  ])("accepts the %s boundary and rejects one above it", (_name, validate, maximum) => {
    expect(() => validate(maximum)).not.toThrow();
    expect(() => validate(maximum + 1)).toThrow(/exceeds limit/);
  });

  it("accepts the audio count boundary and rejects one above it", () => {
    expect(() =>
      validateAudioResources(DECK_PACKAGE_LIMITS.maximumAudioFileCount, [])
    ).not.toThrow();
    expect(() => validateAudioResources(DECK_PACKAGE_LIMITS.maximumAudioFileCount + 1, [])).toThrow(
      /Audio file count .* exceeds limit/
    );
  });

  it("accepts the individual audio size boundary and rejects one above it", () => {
    expect(() =>
      validateAudioResources(1, [DECK_PACKAGE_LIMITS.maximumAudioFileBytes])
    ).not.toThrow();
    expect(() =>
      validateAudioResources(1, [DECK_PACKAGE_LIMITS.maximumAudioFileBytes + 1])
    ).toThrow(/Audio file size .* exceeds limit/);
  });
});
