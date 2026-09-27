import { z } from "zod";

import { DECK_SCHEMA_CONSTRAINTS as CONSTRAINTS, DECK_SCHEMA_VERSION } from "./deck.constants";

const IdSchema = z.uuid();
const TimestampSchema = z.iso.datetime({ offset: true });

const FlashcardSchema = z.compile(
  z.strictObject({
    id: IdSchema,
    question: z.string().min(CONSTRAINTS.minTextLength),
    answer: z.string().min(CONSTRAINTS.minTextLength),
    lessonId: IdSchema.nullable(),
    audio: z.boolean(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

const LessonSchema = z.compile(
  z.strictObject({
    id: IdSchema,
    title: z.string().min(CONSTRAINTS.minTextLength),
  })
);

/** Schema 1 describes a published deck manifest; draft validation can be less strict. */
export const DeckSchema = z.compile(
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
    lessons: z.array(LessonSchema).max(CONSTRAINTS.maxLessons),
  })
);

export type Flashcard = z.infer<typeof FlashcardSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Deck = z.infer<typeof DeckSchema>;
