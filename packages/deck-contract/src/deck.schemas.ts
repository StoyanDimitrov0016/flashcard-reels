import { z } from "zod";

import { DECK_SCHEMA_CONSTRAINTS as CONSTRAINTS, DECK_SCHEMA_VERSION } from "./deck.constants.ts";

const IdSchema = z.uuid();
const TimestampSchema = z.iso.datetime({ offset: true });

export const FlashcardSchema = z.compile(
  z.strictObject({
    id: IdSchema,
    question: z.string().min(CONSTRAINTS.minTextLength),
    answer: z.string().min(CONSTRAINTS.minTextLength),
    lessonId: IdSchema.nullable(),
    lessonSectionId: IdSchema.nullable(),
    audio: z.boolean(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

const LessonSectionManifestSchema = z.strictObject({
  id: IdSchema,
  title: z.string().trim().min(CONSTRAINTS.minTextLength),
});

const LessonManifestSchema = z.compile(
  z.strictObject({
    id: IdSchema,
    title: z.string().min(CONSTRAINTS.minTextLength),
    intro: z.boolean(),
    sections: z.array(LessonSectionManifestSchema).max(CONSTRAINTS.maxSectionsPerLesson),
  })
);

export const DeckManifestSchema = z.compile(
  z.strictObject({
    schema: z.literal(DECK_SCHEMA_VERSION),
    id: IdSchema,
    authorId: IdSchema,
    revision: z.number().int().min(CONSTRAINTS.minRevision),
    title: z.string().min(CONSTRAINTS.minTextLength),
    description: z.string(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    cards: z.array(FlashcardSchema).min(CONSTRAINTS.minFlashcards).max(CONSTRAINTS.maxFlashcards),
    lessons: z.array(LessonManifestSchema).max(CONSTRAINTS.maxLessons),
  })
);

export type Flashcard = z.infer<typeof FlashcardSchema>;
export type DeckManifest = z.infer<typeof DeckManifestSchema>;
