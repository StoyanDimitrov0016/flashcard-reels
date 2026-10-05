import type { Deck, DeckPackage } from "../deck.types.ts";
import type { DeckPackageParseIssue } from "../errors/deck-parse-issue.ts";

import { decodeUtf8 } from "../content/decode-utf8.ts";
import { readDeckContent } from "../content/read-deck-content.ts";
import { DECK_PACKAGE_LIMITS as LIMITS } from "../deck.constants.ts";
import { DeckPackageParseError } from "../errors/deck-package-parse-error.ts";
import { decodeDeckManifest } from "../manifest/parse-deck-manifest.ts";
import { audioPath, deckPackagePaths } from "./deck-package-paths.ts";

export function parseDeckFiles(files: Readonly<Record<string, Uint8Array>>): DeckPackage {
  const issues: DeckPackageParseIssue[] = [];
  const manifestBytes = files["deck.json"];
  if (!manifestBytes?.byteLength) {
    throw new DeckPackageParseError([
      { path: ["deck.json"], message: "Missing or empty manifest" },
    ]);
  }
  const manifest = decodeDeckManifest(manifestBytes, issues);
  let totalBytes = 0;
  for (const [path, bytes] of Object.entries(files)) {
    totalBytes += bytes.byteLength;
    let limit: number = LIMITS.maxLessonTextFileBytes;
    if (path === "deck.json") {
      limit = LIMITS.maxManifestFileBytes;
    } else if (path.startsWith("audio/")) {
      limit = LIMITS.maxAudioFileBytes;
    }
    if (bytes.byteLength > limit) {
      issues.push({ path: [path], message: "File exceeds size limit" });
    }
  }
  if (totalBytes > LIMITS.maxUncompressedBytes) {
    issues.push({ path: [], message: "Expanded package exceeds size limit" });
  }
  if (!manifest) {
    throw new DeckPackageParseError(issues);
  }
  const expected = deckPackagePaths(manifest);
  for (const path of Object.keys(files)) {
    if (!expected.has(path)) {
      issues.push({ path: [path], message: "Unreferenced archive file" });
    }
  }
  const audio = new Map<string, Uint8Array>();
  for (const card of manifest.cards) {
    if (!card.audio) {
      continue;
    }
    const path = audioPath(card.id);
    const bytes = files[path];
    if (!bytes?.byteLength) {
      issues.push({ path: [path], message: "Missing or empty audio file" });
    } else {
      audio.set(card.id, bytes);
    }
  }
  let deck: Deck | undefined;
  try {
    deck = readDeckContent(manifest, (path) => {
      const bytes = files[path];
      if (!bytes) {
        return undefined;
      }
      const text = decodeUtf8(bytes);
      if (text === undefined) {
        issues.push({ path: [path], message: "Lesson text must be valid UTF-8" });
      }
      return text;
    });
  } catch (error) {
    if (!(error instanceof DeckPackageParseError)) {
      throw error;
    }
    issues.push(...error.issues);
  }
  if (!deck || issues.length > 0) {
    throw new DeckPackageParseError(issues);
  }
  return { deck, audio };
}
