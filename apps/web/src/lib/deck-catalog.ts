import * as z from "zod";

const DeckCatalogEntrySchema = z.compile(
  z.object({
    id: z.uuid(),
    fileName: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    version: z.number().int().positive(),
    cards: z.number().int().nonnegative(),
    audio: z.number().int().nonnegative(),
    size: z.string().min(1),
  })
);

export const DeckCatalogSchema = z.compile(z.array(DeckCatalogEntrySchema));

export type DeckCatalogEntry = Readonly<{
  id: string;
  fileName: string;
  title: string;
  description: string;
  version: number;
  cards: number;
  audio: number;
  size: string;
}>;

export const deckCatalog: readonly DeckCatalogEntry[] = [
  {
    id: "ed10310f-6d24-4c52-b5c7-bc98081e1606",
    fileName: "Computer Science.fcrdeck",
    title: "Computer Science",
    description:
      "Algorithms, data structures, complexity, graphs, trees, hashing, concurrency fundamentals, networking, and computation.",
    version: 1,
    cards: 109,
    audio: 109,
    size: "13.5 MB",
  },
  {
    id: "b66fad55-88ba-4047-986b-15e4ff7a3053",
    fileName: "Databases.fcrdeck",
    title: "Databases",
    description:
      "Relational modeling, SQL, indexes, transactions, isolation, query planning, replication, partitioning, and distributed data.",
    version: 1,
    cards: 111,
    audio: 111,
    size: "14.6 MB",
  },
  {
    id: "4e4c5ba0-51d0-4619-9c88-920e6ff12d6e",
    fileName: "JavaScript.fcrdeck",
    title: "JavaScript",
    description:
      "Core language semantics, objects, functions, async behavior, modules, memory, and practical runtime reasoning.",
    version: 1,
    cards: 116,
    audio: 116,
    size: "16.8 MB",
  },
  {
    id: "27962017-2742-4862-9520-08b0dc1c1c6b",
    fileName: "Operating Systems and Hardware.fcrdeck",
    title: "Operating Systems and Hardware",
    description:
      "Processes, threads, memory, virtual memory, filesystems, scheduling, synchronization, CPU caches, storage, and I/O.",
    version: 1,
    cards: 109,
    audio: 109,
    size: "14.9 MB",
  },
  {
    id: "06bd0ca5-587e-4854-92f8-ad972b72f0ed",
    fileName: "React.fcrdeck",
    title: "React",
    description:
      "Components, rendering, state, effects, hooks, reconciliation, performance, forms, concurrency, and modern React behavior.",
    version: 1,
    cards: 117,
    audio: 117,
    size: "16.8 MB",
  },
  {
    id: "40bf0d86-f860-478c-83b8-e490fed65a5e",
    fileName: "System Design.fcrdeck",
    title: "System Design",
    description:
      "Scalability, reliability, data flow, distributed systems, APIs, caching, messaging, storage, and operational trade-offs.",
    version: 1,
    cards: 112,
    audio: 112,
    size: "15.3 MB",
  },
];

export function getDeckObjectKey(deckId: string) {
  const deck = deckCatalog.find((entry) => entry.id === deckId);
  if (!deck) {
    throw new Error("Unknown deck");
  }
  return "decks/" + deck.fileName;
}
