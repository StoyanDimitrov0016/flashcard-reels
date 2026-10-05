import {
  parseDeckManifest,
  deckPackagePaths,
  readDeckContent as resolveDeckContent,
  DeckPackageParseError,
  type DeckManifest,
  type DeckPackageParseIssue,
  type Lesson,
  type Flashcard,
} from "@flashcard-reels/deck-contract";

import type { ZipRangeReader } from "@/server/decks/zip-range-reader";

export type DeckCard = Flashcard;
export type DeckLesson = Lesson;

export type DeckSummary = Readonly<{
  id: string;
  key: string;
  title: string;
  description: string;
  revision: number;
  updatedAt: string;
  cardCount: number;
  lessonCount: number;
  audioCount: number;
  sizeBytes: number;
}>;

export type DeckContent = DeckSummary &
  Readonly<{ cards: readonly DeckCard[]; lessons: readonly DeckLesson[] }>;

async function readDocument(reader: ZipRangeReader): Promise<DeckManifest> {
  const bytes = await reader.read("deck.json");
  if (!bytes) {
    throw new DeckPackageParseError([{ path: ["deck.json"], message: "Missing manifest" }]);
  }
  const document = parseDeckManifest(bytes);
  const expected = deckPackagePaths(document);
  const present = new Set(reader.entries.map((entry) => entry.name));
  const issues: DeckPackageParseIssue[] = [];
  for (const path of expected) {
    if (!present.has(path)) {
      issues.push({ path: [path], message: "Missing declared file" });
    }
  }
  for (const entry of reader.entries) {
    if (!expected.has(entry.name)) {
      issues.push({ path: [entry.name], message: "Unexpected file" });
    } else if (entry.uncompressedSize === 0) {
      issues.push({ path: [entry.name], message: "Empty declared file" });
    }
  }
  if (issues.length > 0) {
    throw new DeckPackageParseError(issues);
  }
  return document;
}

function summarize(document: DeckManifest, key: string, sizeBytes: number): DeckSummary {
  return {
    audioCount: document.cards.filter((card) => card.audio).length,
    cardCount: document.cards.length,
    description: document.description,
    id: document.id,
    key,
    lessonCount: document.lessons.length,
    revision: document.revision,
    sizeBytes,
    title: document.title,
    updatedAt: document.updatedAt,
  };
}

export async function readDeckSummary(
  reader: ZipRangeReader,
  key: string,
  sizeBytes: number
): Promise<DeckSummary> {
  return summarize(await readDocument(reader), key, sizeBytes);
}

export async function readDeckContent(
  reader: ZipRangeReader,
  key: string,
  sizeBytes: number
): Promise<DeckContent> {
  const document = await readDocument(reader);
  const texts = new Map<string, string>();
  const issues: DeckPackageParseIssue[] = [];
  await Promise.all(
    [...deckPackagePaths(document)]
      .filter((path) => path.endsWith(".md"))
      .map(async (path) => {
        const bytes = await reader.read(path);
        if (bytes) {
          try {
            texts.set(path, new TextDecoder("utf-8", { fatal: true }).decode(bytes));
          } catch (error) {
            if (!(error instanceof TypeError)) {
              throw error;
            }
            issues.push({ path: [path], message: "Lesson text is not valid UTF-8" });
          }
        }
      })
  );
  let resolved;
  try {
    resolved = resolveDeckContent(document, (path) => texts.get(path));
  } catch (error) {
    if (!(error instanceof DeckPackageParseError)) {
      throw error;
    }
    issues.push(...error.issues);
  }
  if (issues.length > 0) {
    throw new DeckPackageParseError(issues);
  }
  if (!resolved) {
    throw new Error("Content resolution did not produce a deck");
  }
  return {
    ...summarize(document, key, sizeBytes),
    cards: resolved.cards,
    lessons: resolved.lessons,
  };
}
