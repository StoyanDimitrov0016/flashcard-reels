import type { DeckAppearanceFields } from "@/features/decks/domain/deck-appearance.model";
import type { DeckFields } from "@/features/decks/domain/deck.model";

export const deckSeedData = [
  {
    id: "4e4c5ba0-51d0-4619-9c88-920e6ff12d6e",
    title: "JavaScript",
    description:
      "Core language semantics, objects, functions, async behavior, modules, memory, and practical runtime reasoning.",
    coverAsset: "javascript",
    createdAt: "2026-09-06T13:26:00Z",
    updatedAt: "2026-09-06T13:26:00Z",
  },
  {
    id: "06bd0ca5-587e-4854-92f8-ad972b72f0ed",
    title: "React",
    description:
      "Components, rendering, state, effects, hooks, reconciliation, performance, forms, concurrency, and modern React behavior.",
    coverAsset: "react",
    createdAt: "2026-09-06T13:26:00Z",
    updatedAt: "2026-09-06T13:26:00Z",
  },
  {
    id: "40bf0d86-f860-478c-83b8-e490fed65a5e",
    title: "System Design",
    description:
      "Scalability, reliability, data flow, distributed systems, APIs, caching, messaging, storage, and operational trade-offs.",
    coverAsset: "system-design",
    createdAt: "2026-09-06T13:26:00Z",
    updatedAt: "2026-09-06T13:26:00Z",
  },
  {
    id: "b66fad55-88ba-4047-986b-15e4ff7a3053",
    title: "Databases",
    description:
      "Relational modeling, SQL, indexes, transactions, isolation, query planning, replication, partitioning, and distributed data.",
    coverAsset: "database",
    createdAt: "2026-09-06T13:26:00Z",
    updatedAt: "2026-09-06T13:26:00Z",
  },
  {
    id: "ed10310f-6d24-4c52-b5c7-bc98081e1606",
    title: "Computer Science",
    description:
      "Algorithms, data structures, complexity, graphs, trees, hashing, concurrency fundamentals, networking, and computation.",
    coverAsset: "computer-science",
    createdAt: "2026-09-06T13:26:00Z",
    updatedAt: "2026-09-06T13:26:00Z",
  },
  {
    id: "27962017-2742-4862-9520-08b0dc1c1c6b",
    title: "Operating Systems and Hardware",
    description:
      "Processes, threads, memory, virtual memory, filesystems, scheduling, synchronization, CPU caches, storage, and I/O.",
    coverAsset: "operating-systems",
    createdAt: "2026-09-06T13:26:00Z",
    updatedAt: "2026-09-06T13:26:00Z",
  },
] satisfies readonly DeckFields[];

export const deckAppearanceSeedData = [
  {
    deckId: "4e4c5ba0-51d0-4619-9c88-920e6ff12d6e",
    accentColor: "#F8C15C",
    backgroundColor: "#17130D",
  },
  {
    deckId: "06bd0ca5-587e-4854-92f8-ad972b72f0ed",
    accentColor: "#61DAFB",
    backgroundColor: "#0B1720",
  },
  {
    deckId: "40bf0d86-f860-478c-83b8-e490fed65a5e",
    accentColor: "#FF9D66",
    backgroundColor: "#1A100D",
  },
  {
    deckId: "b66fad55-88ba-4047-986b-15e4ff7a3053",
    accentColor: "#82E0B0",
    backgroundColor: "#0D1815",
  },
  {
    deckId: "ed10310f-6d24-4c52-b5c7-bc98081e1606",
    accentColor: "#B8A5FF",
    backgroundColor: "#131020",
  },
  {
    deckId: "27962017-2742-4862-9520-08b0dc1c1c6b",
    accentColor: "#D7A7FF",
    backgroundColor: "#1A1020",
  },
] satisfies readonly DeckAppearanceFields[];
