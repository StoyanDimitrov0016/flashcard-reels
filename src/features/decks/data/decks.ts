import type { DeckAppearanceFields } from "@/features/decks/domain/deck-appearance.model";
import type { DeckFields, DeckId } from "@/features/decks/domain/deck.model";

const POC_TIMESTAMP = "2026-09-04T00:00:00.000Z";

export const deckFieldsById = {
  javascript: {
    id: "javascript",
    title: "JavaScript",
    description: "Closures, execution, and functional foundations",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  web: {
    id: "web",
    title: "Web Development",
    description: "React, HTTP, and practical data systems",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  "computer-science": {
    id: "computer-science",
    title: "Computer Science",
    description: "Algorithms, memory, concurrency, and architecture",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  react: {
    id: "react",
    title: "React",
    description: "Components, rendering, state, and effects",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  "system-design": {
    id: "system-design",
    title: "System Design",
    description: "Scalable services, queues, caching, and trade-offs",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
  databases: {
    id: "databases",
    title: "Databases",
    description: "Indexes, transactions, consistency, and data modeling",
    createdAt: POC_TIMESTAMP,
    updatedAt: POC_TIMESTAMP,
  },
} satisfies Record<DeckId, DeckFields>;

export const deckAppearanceFieldsById = {
  javascript: {
    deckId: "javascript",
    accentColor: "#F8C15C",
    backgroundColor: "#17130D",
  },
  web: {
    deckId: "web",
    accentColor: "#73D9FF",
    backgroundColor: "#0B151A",
  },
  "computer-science": {
    deckId: "computer-science",
    accentColor: "#B8A5FF",
    backgroundColor: "#131020",
  },
  react: {
    deckId: "react",
    accentColor: "#61DAFB",
    backgroundColor: "#0B1720",
  },
  "system-design": {
    deckId: "system-design",
    accentColor: "#FF9D66",
    backgroundColor: "#1A100D",
  },
  databases: {
    deckId: "databases",
    accentColor: "#82E0B0",
    backgroundColor: "#0D1815",
  },
} satisfies Record<DeckId, DeckAppearanceFields>;

export const deckSeedData = Object.values(deckFieldsById);
export const deckAppearanceSeedData = Object.values(deckAppearanceFieldsById);
