import * as z from "zod";

export const DeckCatalogEntrySchema = z.compile(
  z.object({
    id: z.uuid(),
    title: z.string().min(1),
    cards: z.number().int().nonnegative(),
    audio: z.number().int().nonnegative(),
    size: z.string().min(1),
  })
);

export const DeckCatalogSchema = z.compile(z.array(DeckCatalogEntrySchema));

export type DeckCatalogEntry = Readonly<{
  id: string;
  title: string;
  cards: number;
  audio: number;
  size: string;
}>;

export const deckCatalog: readonly DeckCatalogEntry[] = [
  {
    id: "ed10310f-6d24-4c52-b5c7-bc98081e1606",
    title: "Computer Science",
    cards: 109,
    audio: 109,
    size: "13.5 MB",
  },
  {
    id: "b66fad55-88ba-4047-986b-15e4ff7a3053",
    title: "Databases",
    cards: 111,
    audio: 111,
    size: "14.6 MB",
  },
  {
    id: "4e4c5ba0-51d0-4619-9c88-920e6ff12d6e",
    title: "JavaScript",
    cards: 116,
    audio: 116,
    size: "16.8 MB",
  },
  {
    id: "27962017-2742-4862-9520-08b0dc1c1c6b",
    title: "Operating Systems and Hardware",
    cards: 109,
    audio: 109,
    size: "14.9 MB",
  },
  {
    id: "06bd0ca5-587e-4854-92f8-ad972b72f0ed",
    title: "React",
    cards: 117,
    audio: 117,
    size: "16.8 MB",
  },
  {
    id: "40bf0d86-f860-478c-83b8-e490fed65a5e",
    title: "System Design",
    cards: 112,
    audio: 112,
    size: "15.3 MB",
  },
];
