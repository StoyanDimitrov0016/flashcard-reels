import type { DeckAppearanceFields } from "@/features/decks/domain/deck-appearance.model";
import type { DeckFields, DeckId } from "@/features/decks/domain/deck.model";

const POC_TIMESTAMP = "2026-09-04T00:00:00.000Z";

export const deckFieldsById = {
  javascript: {
    id: "a73071db-1fcb-4ffa-8f08-bd353dd5cfc1",
    title: "JavaScript",
    description: "Closures, execution, and functional foundations",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  web: {
    id: "96304c68-29e7-457a-a8bc-95c77950f936",
    title: "Web Development",
    description: "React, HTTP, and practical data systems",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  "computer-science": {
    id: "a493507b-98ad-4687-8b20-6a973f15537c",
    title: "Computer Science",
    description: "Algorithms, memory, concurrency, and architecture",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  react: {
    id: "320a728c-70d0-48af-a76d-6775ebd4edfd",
    title: "React",
    description: "Components, rendering, state, and effects",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  "system-design": {
    id: "7933e82d-b6eb-4267-9590-c93fbbca47de",
    title: "System Design",
    description: "Scalable services, queues, caching, and trade-offs",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  databases: {
    id: "c4f7484f-5731-4e26-9eec-9cc19c7e0a3e",
    title: "Databases",
    description: "Indexes, transactions, consistency, and data modeling",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
} satisfies Record<DeckId, DeckFields>;

export const deckAppearanceFieldsById = {
  javascript: {
    deckId: "a73071db-1fcb-4ffa-8f08-bd353dd5cfc1",
    accentColor: "#F8C15C",
    backgroundColor: "#17130D",
  },
  web: {
    deckId: "96304c68-29e7-457a-a8bc-95c77950f936",
    accentColor: "#73D9FF",
    backgroundColor: "#0B151A",
  },
  "computer-science": {
    deckId: "a493507b-98ad-4687-8b20-6a973f15537c",
    accentColor: "#B8A5FF",
    backgroundColor: "#131020",
  },
  react: {
    deckId: "320a728c-70d0-48af-a76d-6775ebd4edfd",
    accentColor: "#61DAFB",
    backgroundColor: "#0B1720",
  },
  "system-design": {
    deckId: "7933e82d-b6eb-4267-9590-c93fbbca47de",
    accentColor: "#FF9D66",
    backgroundColor: "#1A100D",
  },
  databases: {
    deckId: "c4f7484f-5731-4e26-9eec-9cc19c7e0a3e",
    accentColor: "#82E0B0",
    backgroundColor: "#0D1815",
  },
} satisfies Record<DeckId, DeckAppearanceFields>;

export const deckSeedData = Object.values(deckFieldsById);
export const deckAppearanceSeedData = Object.values(deckAppearanceFieldsById);

export const deckIdBySeedKey: Readonly<Record<string, DeckId>> = {
  javascript: deckFieldsById.javascript.id,
  web: deckFieldsById.web.id,
  "computer-science": deckFieldsById["computer-science"].id,
  react: deckFieldsById.react.id,
  "system-design": deckFieldsById["system-design"].id,
  databases: deckFieldsById.databases.id,
};
