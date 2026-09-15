import { strFromU8, unzipSync } from "fflate";
import * as z from "zod";
import { readDeckObject } from "@/lib/r2";
import { getDeckObjectKey } from "@/lib/deck-catalog";

const DeckPackageCardSchema = z.compile(
  z
    .object({
      id: z.uuid(),
      order: z.number().int().nonnegative(),
      question: z.string().min(1),
      answer: z.string().min(1),
      createdAt: z.iso.datetime({ offset: true }),
      updatedAt: z.iso.datetime({ offset: true }),
    })
    .strict()
);

export const DeckPackageSchema = z.compile(
  z
    .object({
      id: z.uuid(),
      version: z.number().int().positive(),
      title: z.string().min(1),
      description: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
      updatedAt: z.iso.datetime({ offset: true }),
      cards: z.array(DeckPackageCardSchema),
    })
    .strict()
);

export type DeckPackage = z.infer<typeof DeckPackageSchema>;

export async function readDeckPackage(deckId: string) {
  const bytes = await readDeckObject(getDeckObjectKey(deckId));
  const files = unzipSync(bytes);
  const deckJson = files["deck.json"];
  if (!deckJson) {
    throw new Error("Deck package is missing deck.json");
  }
  return DeckPackageSchema.parse(JSON.parse(strFromU8(deckJson)));
}
