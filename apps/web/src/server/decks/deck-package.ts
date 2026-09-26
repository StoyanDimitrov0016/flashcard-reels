import { strFromU8 } from "fflate";
import * as z from "zod";

import type { ZipRangeReader } from "@/server/decks/zip-range-reader";

// Mirrors the `.fcrdeck` document described in docs/deck-packages.md.
const DeckCardSchema = z
  .object({
    id: z.uuid(),
    order: z.number().int().nonnegative(),
    question: z.string().min(1),
    answer: z.string().min(1),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const DeckLessonSchema = z
  .object({
    id: z.uuid(),
    order: z.number().int().nonnegative(),
    title: z.string().min(1),
  })
  .strict();

const DeckDocumentSchema = z.compile(
  z
    .object({
      id: z.uuid(),
      version: z.number().int().positive(),
      title: z.string().min(1),
      description: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
      updatedAt: z.iso.datetime({ offset: true }),
      cards: z.array(DeckCardSchema),
      lessons: z.array(DeckLessonSchema).optional(),
    })
    .strict()
);

type DeckDocument = z.infer<typeof DeckDocumentSchema>;

export type DeckCard = z.infer<typeof DeckCardSchema>;

export type DeckLesson = Readonly<{ id: string; order: number; title: string; markdown: string }>;

export type DeckSummary = Readonly<{
  id: string;
  key: string;
  title: string;
  description: string;
  version: number;
  updatedAt: string;
  cardCount: number;
  lessonCount: number;
  audioCount: number;
  sizeBytes: number;
}>;

export type DeckContent = DeckSummary &
  Readonly<{ cards: readonly DeckCard[]; lessons: readonly DeckLesson[] }>;

const AudioEntryPattern = /^audio\/[^/]+\.(?:answer|question)\.mp3$/;

async function readDocument(reader: ZipRangeReader): Promise<DeckDocument> {
  const bytes = await reader.read("deck.json");
  if (!bytes) {
    throw new Error("Invalid deck package: missing deck.json");
  }
  return DeckDocumentSchema.parse(JSON.parse(strFromU8(bytes)));
}

function summarize(
  document: DeckDocument,
  reader: ZipRangeReader,
  key: string,
  sizeBytes: number
): DeckSummary {
  return {
    audioCount: reader.entries.filter((entry) => AudioEntryPattern.test(entry.name)).length,
    cardCount: document.cards.length,
    description: document.description,
    id: document.id,
    key,
    lessonCount: document.lessons?.length ?? 0,
    sizeBytes,
    title: document.title,
    updatedAt: document.updatedAt,
    version: document.version,
  };
}

export async function readDeckSummary(
  reader: ZipRangeReader,
  key: string,
  sizeBytes: number
): Promise<DeckSummary> {
  return summarize(await readDocument(reader), reader, key, sizeBytes);
}

export async function readDeckContent(
  reader: ZipRangeReader,
  key: string,
  sizeBytes: number
): Promise<DeckContent> {
  const document = await readDocument(reader);
  const lessons = await Promise.all(
    (document.lessons ?? []).map(async (lesson) => {
      const bytes = await reader.read(`lessons/${lesson.id}.md`);
      if (!bytes) {
        throw new Error(`Invalid deck package: missing lesson ${lesson.id}`);
      }
      return {
        id: lesson.id,
        markdown: strFromU8(bytes),
        order: lesson.order,
        title: lesson.title,
      };
    })
  );
  return {
    ...summarize(document, reader, key, sizeBytes),
    cards: document.cards.toSorted((left, right) => left.order - right.order),
    lessons: lessons.toSorted((left, right) => left.order - right.order),
  };
}
