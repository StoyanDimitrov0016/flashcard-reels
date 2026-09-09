import { z } from "zod";

const UuidSchema = z.compile(z.uuid());

export const DeckPackageManifestSchema = z
  .object({
    id: UuidSchema,
    version: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const DeckPackageCardSchema = z
  .object({
    id: UuidSchema,
    deckId: UuidSchema,
    question: z.string().min(1),
    answer: z.string().min(1),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    order: z.number().int().nonnegative(),
    questionAudio: z.string().optional(),
    answerAudio: z.string().optional(),
  })
  .strict();

export type DeckPackageManifest = z.infer<typeof DeckPackageManifestSchema>;
export type DeckPackageCard = z.infer<typeof DeckPackageCardSchema>;

export function isSafeDeckPackagePath(path: string): boolean {
  if (!path || path.includes("\\") || path.startsWith("/") || path.includes("\0")) {
    return false;
  }
  const segments = path.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}
