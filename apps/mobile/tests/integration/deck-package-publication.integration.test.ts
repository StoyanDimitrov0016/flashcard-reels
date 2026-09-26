import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { DeckPackageDocument } from "@/features/decks/deck-installer/internal/deck-package.schema";

import { ArchiveDeckPackageReader } from "@/features/decks/deck-installer/internal/archive-deck-package.reader";
import {
  canPublish,
  publicationUploads,
  reviewDeckPublication,
  type DeckPublicationCandidate,
  type PublishedDeckStore,
} from "@/features/decks/deck-installer/internal/deck-package-publication";
import { createDeckPackageArchive } from "@/features/decks/deck-installer/internal/deck-package-writer";

const deckId = "3f9c2d4e-8a61-4b7f-9c2e-1d5a6b7c8d90";
const otherDeckId = "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const cardIds = [
  "0b7e6f1a-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
  "1c8f7a2b-3d4e-4f5a-9b0c-1d2e3f4a5b6c",
  "2d9a8b3c-4e5f-4a6b-8c1d-2e3f4a5b6c7d",
] as const;
const replacementCardId = "3e0b9c4d-5f6a-4b7c-9d2e-3f4a5b6c7d8e";
const timestamp = "2026-09-01T00:00:00.000Z";

const cardTexts = [
  ["What is vertical scaling?", "Add more resources to one machine."],
  ["What is horizontal scaling?", "Add more machines."],
  ["What does a load balancer do?", "It spreads requests across servers."],
] as const;

type CardEdit = Readonly<{ id?: string; answer?: string }>;

function deckCards(edits: Readonly<Record<number, CardEdit>> = {}) {
  return cardTexts.map(([question, answer], order) => ({
    answer: edits[order]?.answer ?? answer,
    createdAt: timestamp,
    id: edits[order]?.id ?? cardIds[order] ?? "",
    order,
    question,
    updatedAt: timestamp,
  }));
}

function deckDocument(overrides: Partial<DeckPackageDocument> = {}): DeckPackageDocument {
  return {
    cards: deckCards(),
    createdAt: timestamp,
    description: "Scaling basics",
    id: deckId,
    title: "Scaling",
    updatedAt: timestamp,
    version: 1,
    ...overrides,
  };
}

function candidate(
  document: DeckPackageDocument,
  fileName = "Scaling.fcrdeck",
  audioFiles: Record<string, Uint8Array> = {},
  lessonFiles: Record<string, string> = {}
): DeckPublicationCandidate {
  const bytes = createDeckPackageArchive(document, audioFiles, lessonFiles);
  return { bytes, fileName, sha256: createHash("sha256").update(bytes).digest("hex") };
}

function storeWith(...published: DeckPublicationCandidate[]): PublishedDeckStore {
  const reader = new ArchiveDeckPackageReader();
  const objects = new Map(published.map((item) => [`decks/${item.fileName}`, item]));
  return {
    listPublishedDecks: () =>
      Promise.resolve(
        [...objects.entries()].map(([key, item]) => {
          const deck = reader.read(item.bytes);
          return {
            deckId: deck.id,
            key,
            sha256: item.sha256,
            title: deck.title,
            version: deck.version,
          };
        })
      ),
    readPublishedDeck: (key) => {
      const item = objects.get(key);
      return item ? Promise.resolve(item.bytes) : Promise.reject(new Error(`Missing ${key}`));
    },
  };
}

function review(store: PublishedDeckStore, ...candidates: DeckPublicationCandidate[]) {
  return reviewDeckPublication({ candidates, reader: new ArchiveDeckPackageReader(), store });
}

function editedCards(answer: string) {
  return deckCards({ 0: { answer } });
}

describe("deck publication review", () => {
  it("reports unchanged decks and uploads nothing", async () => {
    const published = candidate(deckDocument());

    const result = await review(storeWith(published), candidate(deckDocument()));

    expect(result.decks[0]?.status).toBe("unchanged");
    expect(canPublish(result)).toBe(true);
    expect(publicationUploads(result, [published])).toEqual([]);
  });

  it("blocks changed content that keeps the published version", async () => {
    const edited = candidate(deckDocument({ cards: editedCards("Use a bigger server.") }));

    const result = await review(storeWith(candidate(deckDocument())), edited);

    expect(result.decks[0]?.status).toBe("blocked");
    expect(result.decks[0]?.blocks.join(" ")).toContain("raise the version");
    expect(canPublish(result)).toBe(false);
    expect(publicationUploads(result, [edited])).toEqual([]);
  });

  it("lists changed cards and uploads an edited deck with a raised version", async () => {
    const edited = candidate(
      deckDocument({ cards: editedCards("Use a bigger server."), version: 2 })
    );

    const result = await review(storeWith(candidate(deckDocument())), edited);

    expect(result.decks[0]).toMatchObject({
      changedCards: [{ id: cardIds[0], question: "What is vertical scaling?" }],
      publishedVersion: 1,
      status: "updated",
      version: 2,
    });
    expect(publicationUploads(result, [edited])).toMatchObject([
      { deckId, key: "decks/Scaling.fcrdeck", version: 2 },
    ]);
  });

  it("warns when a card reappears with the same text under a new ID", async () => {
    const cards = deckCards({ 1: { id: replacementCardId } });

    const result = await review(
      storeWith(candidate(deckDocument())),
      candidate(deckDocument({ cards, version: 2 }))
    );

    expect(result.decks[0]?.status).toBe("updated");
    expect(result.decks[0]?.warnings).toHaveLength(1);
    expect(result.decks[0]?.warnings[0]).toContain("What is horizontal scaling?");
    expect(result.decks[0]?.warnings[0]).toContain(replacementCardId);
  });

  it("blocks a version lower than the published one", async () => {
    const result = await review(
      storeWith(candidate(deckDocument({ version: 3 }))),
      candidate(deckDocument({ version: 2 }))
    );

    expect(result.decks[0]?.status).toBe("blocked");
    expect(canPublish(result)).toBe(false);
  });

  it("requires a version change when only audio changes", async () => {
    const audio = { [`audio/${cardIds[0]}.answer.mp3`]: new Uint8Array([1, 2, 3]) };

    const result = await review(
      storeWith(candidate(deckDocument())),
      candidate(deckDocument(), "Scaling.fcrdeck", audio)
    );

    expect(result.decks[0]).toMatchObject({ audioChanged: true, status: "blocked" });
  });

  it("blocks card IDs shared by different decks", async () => {
    const otherDeck = candidate(deckDocument({ id: otherDeckId, title: "Other" }), "Other.fcrdeck");

    const result = await review(storeWith(), candidate(deckDocument()), otherDeck);

    expect(result.blocks).toHaveLength(cardIds.length);
    expect(canPublish(result)).toBe(false);
  });

  it("reports new decks and warns when their title matches another published deck", async () => {
    const renamedDeck = candidate(deckDocument({ id: otherDeckId }), "Scaling copy.fcrdeck");

    const result = await review(storeWith(candidate(deckDocument())), renamedDeck);

    expect(result.decks[0]).toMatchObject({ publishedVersion: null, status: "new" });
    expect(result.decks[0]?.addedCards).toHaveLength(cardIds.length);
    expect(result.decks[0]?.warnings[0]).toContain(deckId);
  });

  it("blocks a published deck under a different file name", async () => {
    const result = await review(
      storeWith(candidate(deckDocument())),
      candidate(deckDocument({ version: 2 }), "Renamed.fcrdeck")
    );

    expect(result.decks[0]?.status).toBe("blocked");
    expect(result.decks[0]?.blocks[0]).toContain("decks/Scaling.fcrdeck");
  });

  it("rejects the whole review when the published catalog cannot be read", async () => {
    const store: PublishedDeckStore = {
      listPublishedDecks: () => Promise.reject(new Error("R2 unreachable")),
      readPublishedDeck: () => Promise.reject(new Error("R2 unreachable")),
    };

    await expect(review(store, candidate(deckDocument({ version: 2 })))).rejects.toThrow(
      "R2 unreachable"
    );
  });

  describe("lessons", () => {
    const lessonId = "4f1c0d5e-6a7b-4c8d-9e0f-1a2b3c4d5e6f";
    const lessons = [{ id: lessonId, order: 0, title: "Why scale" }];
    const withLesson = (markdown: string, version = 1, id = deckId) =>
      candidate(
        deckDocument({ id, lessons, title: id === deckId ? "Scaling" : "Other", version }),
        id === deckId ? "Scaling.fcrdeck" : "Other.fcrdeck",
        {},
        { [lessonId]: markdown }
      );

    it("blocks edited lesson content that keeps the published version", async () => {
      const result = await review(storeWith(withLesson("Original")), withLesson("Edited"));

      expect(result.decks[0]).toMatchObject({
        changedLessons: [{ id: lessonId, title: "Why scale" }],
        status: "blocked",
      });
    });

    it("lists added and changed lessons for a raised version", async () => {
      const withoutLessons = candidate(deckDocument());

      const added = await review(storeWith(withoutLessons), withLesson("Original", 2));
      const changed = await review(storeWith(withLesson("Original")), withLesson("Edited", 2));

      expect(added.decks[0]).toMatchObject({ addedLessons: [{ id: lessonId }], status: "updated" });
      expect(changed.decks[0]).toMatchObject({
        changedLessons: [{ id: lessonId }],
        status: "updated",
      });
    });

    it("blocks lesson IDs shared by different decks", async () => {
      const otherCards = deckCards({
        0: { id: "5a2d1e6f-7b8c-4d9e-8f1a-2b3c4d5e6f7a" },
        1: { id: "6b3e2f7a-8c9d-4e0f-9a2b-3c4d5e6f7a8b" },
        2: { id: "7c4f3a8b-9d0e-4f1a-8b3c-4d5e6f7a8b9c" },
      });
      const otherDeck = candidate(
        deckDocument({ cards: otherCards, id: otherDeckId, lessons, title: "Other" }),
        "Other.fcrdeck",
        {},
        { [lessonId]: "Copy" }
      );

      const result = await review(storeWith(), withLesson("Original"), otherDeck);

      expect(result.blocks).toEqual([expect.stringContaining(`Lesson ${lessonId}`)]);
    });
  });
});
