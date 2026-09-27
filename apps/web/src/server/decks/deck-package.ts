import { parseDeck, type Deck, type Flashcard } from "@flashcard-reels/deck-contract";
import { strFromU8 } from "fflate";

import type { ZipRangeReader } from "@/server/decks/zip-range-reader";

export type DeckCard = Flashcard;
export type DeckLesson = Readonly<{ id: string; title: string; markdown: string }>;

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

async function readDocument(reader: ZipRangeReader): Promise<Deck> {
  const bytes = await reader.read("deck.json");
  if (!bytes) {
    throw new Error("Invalid deck package: missing deck.json");
  }
  const document = parseDeck(JSON.parse(strFromU8(bytes)));
  const expected = new Set([
    "deck.json",
    ...document.cards.filter((card) => card.audio).map((card) => `audio/${card.id}.mp3`),
    ...document.lessons.map((lesson) => `lessons/${lesson.id}.md`),
  ]);
  if (
    reader.entries.length !== expected.size ||
    reader.entries.some((entry) => !expected.has(entry.name) || entry.uncompressedSize === 0)
  ) {
    throw new Error("Invalid deck package: assets do not match deck.json");
  }
  return document;
}

function summarize(document: Deck, key: string, sizeBytes: number): DeckSummary {
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
  const lessons = await Promise.all(
    document.lessons.map(async (lesson) => {
      const bytes = await reader.read(`lessons/${lesson.id}.md`);
      if (!bytes) {
        throw new Error(`Invalid deck package: missing lesson ${lesson.id}`);
      }
      const markdown = strFromU8(bytes);
      if (!markdown.trim()) {
        throw new Error(`Invalid deck package: empty lesson ${lesson.id}`);
      }
      return { id: lesson.id, markdown, title: lesson.title };
    })
  );
  return {
    ...summarize(document, key, sizeBytes),
    cards: document.cards,
    lessons,
  };
}
