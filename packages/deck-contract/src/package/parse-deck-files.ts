import type { Deck, DeckPackage } from "../deck.types.ts";
import type { DeckPackageParseIssue } from "../errors/deck-parse-issue.ts";

import { readDeckContent } from "../content/read-deck-content.ts";
import { DECK_PACKAGE_LIMITS as LIMITS } from "../deck.constants.ts";
import { DeckPackageParseError } from "../errors/deck-package-parse-error.ts";
import { decodeDeckManifest } from "../manifest/parse-deck-manifest.ts";
import { audioPath } from "./deck-package-paths.ts";

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
  const entries = new Map(Object.entries(files));
  const entrySizes = new Map([...entries].map(([path, bytes]) => [path, bytes.byteLength]));
  const audio = new Map<string, Uint8Array>();
  for (const card of manifest.cards) {
    const bytes = card.audio ? files[audioPath(card.id)] : undefined;
    // Missing and empty audio entries are reported by the entry check in readDeckContent.
    if (bytes?.byteLength) {
      audio.set(card.id, bytes);
    }
  }
  let deck: Deck | undefined;
  try {
    deck = readDeckContent(manifest, entrySizes, entries);
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
