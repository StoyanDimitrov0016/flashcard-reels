import { z } from "zod";

import { DECK_CONSTRAINTS } from "./deck.constants";

const IdSchema = z.uuid();
const TimestampSchema = z.iso.datetime({ offset: true });

export const FlashcardSchema = z.compile(
  z.strictObject({
    id: IdSchema,
    question: z.string().min(DECK_CONSTRAINTS.minimumTextLength),
    answer: z.string().min(DECK_CONSTRAINTS.minimumTextLength),
    lessonId: IdSchema.nullable(),
    audio: z.boolean(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

export const LessonSchema = z.compile(
  z.strictObject({
    id: IdSchema,
    title: z.string().min(DECK_CONSTRAINTS.minimumTextLength),
  })
);

/** Schema 1 describes a published deck manifest; draft validation can be less strict. */
export const DeckSchema = z.compile(
  z.strictObject({
    schema: z.literal(DECK_CONSTRAINTS.schema),
    id: IdSchema,
    authorId: IdSchema,
    revision: z.number().int().min(DECK_CONSTRAINTS.minimumRevision),
    title: z.string().min(DECK_CONSTRAINTS.minimumTextLength),
    description: z.string(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    cards: z
      .array(FlashcardSchema)
      .min(DECK_CONSTRAINTS.minimumFlashcards)
      .max(DECK_CONSTRAINTS.maximumFlashcards),
    lessons: z.array(LessonSchema).max(DECK_CONSTRAINTS.maximumLessons),
  })
);

export type Flashcard = z.infer<typeof FlashcardSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Deck = z.infer<typeof DeckSchema>;
