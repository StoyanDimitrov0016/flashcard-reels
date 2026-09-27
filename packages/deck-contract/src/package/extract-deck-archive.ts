import { unzipSync, type UnzipFileInfo } from "fflate";

import {
  DECK_SCHEMA_CONSTRAINTS as CONSTRAINTS,
  DECK_PACKAGE_LIMITS as LIMITS,
} from "../deck.constants";
import { DeckPackageParseError } from "../errors/deck-package-parse-error";
import { rejectDeckPackage } from "./reject-deck-package";
import { validateZipMetadata } from "./validate-zip-metadata";

const AudioPathPattern = /^audio\/[0-9a-f-]{36}\.mp3$/i;
const LessonPathPattern = /^lessons\/[0-9a-f-]{36}\.md$/i;

function checkEntryPath(name: string): void {
  if (name !== "deck.json" && !AudioPathPattern.test(name) && !LessonPathPattern.test(name)) {
    rejectDeckPackage(`Unexpected archive path: ${name}`, [name]);
  }
}

function checkExtractedSizes(files: Record<string, Uint8Array>): void {
  let totalBytes = 0;
  for (const [path, content] of Object.entries(files)) {
    totalBytes += content.byteLength;
    if (totalBytes > LIMITS.maxUncompressedBytes) {
      rejectDeckPackage("Expanded package exceeds size limit");
    }
    if (path.startsWith("audio/") && content.byteLength > LIMITS.maxAudioFileBytes) {
      rejectDeckPackage(`Audio file exceeds size limit: ${path}`, [path]);
    }
    if (path.startsWith("lessons/") && content.byteLength > LIMITS.maxLessonFileBytes) {
      rejectDeckPackage(`Lesson file exceeds size limit: ${path}`, [path]);
    }
  }
}

/** fflate calls the filter with each entry's declared sizes before decompressing it. */
export function extractDeckArchive(bytes: Uint8Array): Record<string, Uint8Array> {
  if (bytes.byteLength > LIMITS.maxCompressedBytes) {
    rejectDeckPackage("Compressed package exceeds size limit");
  }
  validateZipMetadata(bytes);

  const paths = new Set<string>();
  let declaredBytes = 0;
  const maximumFiles = 1 + CONSTRAINTS.maxFlashcards + CONSTRAINTS.maxLessons;

  function inspectEntry({ name, size, originalSize, compression }: UnzipFileInfo): boolean {
    checkEntryPath(name);

    if (paths.has(name)) {
      rejectDeckPackage(`Duplicate archive path: ${name}`, [name]);
    }

    paths.add(name);

    if (paths.size > maximumFiles) {
      rejectDeckPackage("Package contains too many files");
    }
    if (compression !== 0 && compression !== 8) {
      rejectDeckPackage(`Unsupported ZIP compression for ${name}`, [name]);
    }
    if (size > bytes.byteLength) {
      rejectDeckPackage(`Invalid compressed size for ${name}`, [name]);
    }

    declaredBytes += originalSize;
    if (declaredBytes > LIMITS.maxUncompressedBytes) {
      rejectDeckPackage("Expanded package exceeds size limit");
    }
    if (name.startsWith("audio/") && originalSize > LIMITS.maxAudioFileBytes) {
      rejectDeckPackage(`Audio file exceeds size limit: ${name}`, [name]);
    }
    if (name.startsWith("lessons/") && originalSize > LIMITS.maxLessonFileBytes) {
      rejectDeckPackage(`Lesson file exceeds size limit: ${name}`, [name]);
    }

    return true;
  }

  try {
    const files = unzipSync(bytes, { filter: inspectEntry });
    checkExtractedSizes(files);
    return files;
  } catch (cause) {
    if (cause instanceof DeckPackageParseError) {
      throw cause;
    }
    throw new DeckPackageParseError([{ path: [], message: "Could not read ZIP archive" }], {
      cause,
    });
  }
}
