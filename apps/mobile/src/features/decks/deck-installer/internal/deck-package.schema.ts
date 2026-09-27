import { z } from "zod";

const UuidSchema = z.uuid();

const DeckPackageCardSchema = z
  .object({
    id: UuidSchema,
    order: z.number().int().nonnegative(),
    question: z.string().min(1),
    answer: z.string().min(1),
    lessonId: UuidSchema.nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const DeckArchiveCardSchema = DeckPackageCardSchema.omit({ lessonId: true });

// Lesson Markdown lives in lessons/<lesson-id>.md; deck.json lists identity, title, and order.
const DeckPackageLessonSchema = z
  .object({
    id: UuidSchema,
    order: z.number().int().nonnegative(),
    title: z.string().min(1),
  })
  .strict();

const DeckDocumentFields = {
  id: UuidSchema,
  version: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  lessons: z.array(DeckPackageLessonSchema).optional(),
};

/** The ZIP manifest keeps card lesson links in card-lessons.json. */
export const DeckArchiveDocumentSchema = z.compile(
  z.object({ ...DeckDocumentFields, cards: z.array(DeckArchiveCardSchema) }).strict()
);

export const DeckPackageSchema = z.compile(
  z
    .object({
      ...DeckDocumentFields,
      cards: z.array(DeckPackageCardSchema),
    })
    .strict()
    .superRefine((deck, context) => {
      const lessons = deck.lessons ?? [];
      const lessonIds = new Set<string>();
      const lessonOrders = new Set<number>();
      const cardIds = new Set(deck.cards.map((card) => card.id));
      for (const [index, card] of deck.cards.entries()) {
        if (card.lessonId && !lessons.some((lesson) => lesson.id === card.lessonId)) {
          context.addIssue({
            code: "custom",
            message: `Flashcard ${card.id} references a lesson outside this deck: ${card.lessonId}`,
            path: ["cards", index, "lessonId"],
          });
        }
      }
      for (const [index, lesson] of lessons.entries()) {
        if (lessonIds.has(lesson.id) || cardIds.has(lesson.id)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate lesson ID: ${lesson.id}`,
            path: ["lessons", index, "id"],
          });
        }
        if (lessonOrders.has(lesson.order)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate lesson order: ${lesson.order}`,
            path: ["lessons", index, "order"],
          });
        }
        lessonIds.add(lesson.id);
        lessonOrders.add(lesson.order);
      }
      for (let order = 0; order < lessons.length; order += 1) {
        if (!lessonOrders.has(order)) {
          context.addIssue({
            code: "custom",
            message: `Lesson orders must be contiguous from 0 through ${lessons.length - 1}`,
            path: ["lessons"],
          });
          break;
        }
      }
      const ids = new Set<string>();
      const orders = new Set<number>();
      for (const [index, card] of deck.cards.entries()) {
        if (ids.has(card.id)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate flashcard ID: ${card.id}`,
            path: ["cards", index, "id"],
          });
        }
        if (orders.has(card.order)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate flashcard order: ${card.order}`,
            path: ["cards", index, "order"],
          });
        }
        ids.add(card.id);
        orders.add(card.order);
      }
      for (let order = 0; order < deck.cards.length; order += 1) {
        if (!orders.has(order)) {
          context.addIssue({
            code: "custom",
            message: `Flashcard orders must be contiguous from 0 through ${deck.cards.length - 1}`,
            path: ["cards"],
          });
          break;
        }
      }
    })
);

export type DeckPackageDocument = z.infer<typeof DeckPackageSchema>;

export function isSafeDeckPackagePath(path: string): boolean {
  if (!path || path.includes("\\") || path.startsWith("/") || path.includes("\0")) {
    return false;
  }
  const segments = path.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}
