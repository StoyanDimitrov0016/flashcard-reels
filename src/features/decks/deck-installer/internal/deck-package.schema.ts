import { z } from "zod";

const UuidSchema = z.uuid();

const DeckPackageCardSchema = z
  .object({
    id: UuidSchema,
    order: z.number().int().nonnegative(),
    question: z.string().min(1),
    answer: z.string().min(1),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const DeckPackageSchema = z
  .object({
    id: UuidSchema,
    version: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    cards: z.array(DeckPackageCardSchema),
  })
  .strict()
  .superRefine((deck, context) => {
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
  });

export type DeckPackageDocument = z.infer<typeof DeckPackageSchema>;

export function isSafeDeckPackagePath(path: string): boolean {
  if (!path || path.includes("\\") || path.startsWith("/") || path.includes("\0")) {
    return false;
  }
  const segments = path.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}
