import { z } from "zod";

const IdSchema = z.uuid();
const TimestampSchema = z.iso.datetime({ offset: true });

export const CardSchema = z.strictObject({
  id: IdSchema,
  question: z.string().min(1),
  answer: z.string().min(1),
  lessonId: IdSchema.nullable(),
  audio: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const LessonSchema = z.strictObject({
  id: IdSchema,
  title: z.string().min(1),
});

/** Schema 1 describes a published deck manifest; draft validation can be less strict. */
export const DeckSchema = z
  .strictObject({
    schema: z.literal(1),
    id: IdSchema,
    authorId: IdSchema,
    revision: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    cards: z.array(CardSchema).min(1).max(1_000),
    lessons: z.array(LessonSchema).max(200),
  })
  .superRefine((deck, context) => {
    const cardIds = new Set<string>();
    for (const [index, card] of deck.cards.entries()) {
      if (cardIds.has(card.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate card ID: ${card.id}`,
          path: ["cards", index, "id"],
        });
      }
      cardIds.add(card.id);
    }

    const lessonIds = new Set<string>();
    for (const [index, lesson] of deck.lessons.entries()) {
      if (lessonIds.has(lesson.id) || cardIds.has(lesson.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate lesson ID: ${lesson.id}`,
          path: ["lessons", index, "id"],
        });
      }
      lessonIds.add(lesson.id);
    }

    for (const [index, card] of deck.cards.entries()) {
      if (card.lessonId !== null && !lessonIds.has(card.lessonId)) {
        context.addIssue({
          code: "custom",
          message: `Card ${card.id} references a lesson outside this deck: ${card.lessonId}`,
          path: ["cards", index, "lessonId"],
        });
      }
    }
  });

export type Card = z.infer<typeof CardSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Deck = z.infer<typeof DeckSchema>;
