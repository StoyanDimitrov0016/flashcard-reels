import {
  checkDeckPackageEntries,
  deckLessonTextPaths,
  parseDeckManifest,
  readDeckContent as resolveDeckContent,
  DeckPackageParseError,
  type DeckManifest,
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

function entrySizes(reader: ZipRangeReader): ReadonlyMap<string, number> {
  return new Map(reader.entries.map((entry) => [entry.name, entry.uncompressedSize]));
}

async function readManifest(reader: ZipRangeReader): Promise<DeckManifest> {
  const bytes = await reader.read("deck.json");
  if (!bytes) {
    throw new DeckPackageParseError([{ path: ["deck.json"], message: "Missing manifest" }]);
  }
  return parseDeckManifest(bytes);
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
  const manifest = await readManifest(reader);
  checkDeckPackageEntries(manifest, entrySizes(reader));
  return summarize(manifest, key, sizeBytes);
}

export async function readDeckContent(
  reader: ZipRangeReader,
  key: string,
  sizeBytes: number
): Promise<DeckContent> {
  const manifest = await readManifest(reader);
  const sizes = entrySizes(reader);
  // Only lesson text is fetched; audio stays in storage. Missing entries are reported by the contract.
  const lessonFiles = new Map(
    await Promise.all(
      deckLessonTextPaths(manifest)
        .filter((path) => sizes.get(path))
        .map(async (path) => {
          const bytes = await reader.read(path);
          if (!bytes) {
            throw new Error(`Listed archive entry could not be read: ${path}`);
          }
          return [path, bytes] as const;
        })
    )
  );
  const deck = resolveDeckContent(manifest, sizes, lessonFiles);
  return { ...summarize(manifest, key, sizeBytes), cards: deck.cards, lessons: deck.lessons };
}
