import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import {
  DeckContractError,
  DeckPackageParseError,
  DeckParseError,
  parseDeck,
  parseDeckPackage,
  type Deck,
} from "../src";

const deckId = "11111111-1111-4111-8111-111111111111";
const cardId = "22222222-2222-4222-8222-222222222222";
const lessonId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-01-01T00:00:00Z";

function createDeck(): Deck {
  return {
    schema: 1,
    id: deckId,
    authorId: "44444444-4444-4444-8444-444444444444",
    revision: 1,
    title: "Sample deck",
    description: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    cards: [
      {
        id: cardId,
        question: "Question",
        answer: "Answer",
        lessonId,
        audio: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    lessons: [{ id: lessonId, title: "Lesson" }],
  };
}

function createPackageFiles(): Record<string, Uint8Array> {
  return {
    "deck.json": strToU8(JSON.stringify(createDeck())),
    [`audio/${cardId}.mp3`]: new Uint8Array([1, 2, 3]),
    [`lessons/${lessonId}.md`]: strToU8("# Lesson\nContent"),
  };
}

function findZipEndRecord(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = bytes.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("Fixture has no ZIP end record");
}

describe("deck contract", () => {
  it("reads a complete package through its public entry point", () => {
    const archive = zipSync(createPackageFiles());

    const result = parseDeckPackage(archive);

    expect(result.deck.id).toBe(deckId);
    expect(result.audioFiles.get(cardId)).toEqual(new Uint8Array([1, 2, 3]));
    expect(result.lessonFiles.get(lessonId)).toBe("# Lesson\nContent");
  });

  it("reports relationship issues with paths after schema validation", () => {
    const deck = createDeck();
    const card = deck.cards[0];
    if (!card) {
      throw new Error("Fixture has no card");
    }
    deck.cards.push({ ...card, lessonId: deckId });

    try {
      parseDeck(deck);
      expect.fail("Expected an invalid deck");
    } catch (error) {
      expect(error).toBeInstanceOf(DeckParseError);
      expect(error).toBeInstanceOf(DeckContractError);
      if (!(error instanceof DeckParseError)) {
        throw error;
      }
      expect(error.code).toBe("DECK_INVALID");
      expect(error.issues.map((issue) => issue.path)).toEqual([
        ["cards", 1, "id"],
        ["cards", 1, "lessonId"],
      ]);
    }
  });

  it("wraps manifest validation failures as package errors with their cause", () => {
    const archive = zipSync({
      "deck.json": strToU8(JSON.stringify({ ...createDeck(), cards: [] })),
    });

    try {
      parseDeckPackage(archive);
      expect.fail("Expected an invalid package");
    } catch (error) {
      expect(error).toBeInstanceOf(DeckPackageParseError);
      if (!(error instanceof DeckPackageParseError)) {
        throw error;
      }
      expect(error.code).toBe("DECK_PACKAGE_INVALID");
      expect(error.cause).toBeInstanceOf(DeckParseError);
      expect(error.issues[0]?.path).toEqual(["cards"]);
    }
  });

  it("rejects package files that the manifest does not reference", () => {
    const archive = zipSync({
      ...createPackageFiles(),
      "audio/55555555-5555-4555-8555-555555555555.mp3": new Uint8Array([2]),
    });

    expect(() => parseDeckPackage(archive)).toThrow(DeckPackageParseError);
  });

  it("rejects a manifest with the wrong schema version", () => {
    expect(() => parseDeck({ ...createDeck(), schema: 2 })).toThrow(DeckParseError);
  });

  it("accepts a deck without optional assets", () => {
    const deck = createDeck();
    const card = deck.cards[0];
    if (!card) {
      throw new Error("Fixture has no card");
    }
    card.audio = false;
    card.lessonId = null;
    deck.lessons = [];

    const result = parseDeckPackage(zipSync({ "deck.json": strToU8(JSON.stringify(deck)) }));

    expect(result.audioFiles.size).toBe(0);
    expect(result.lessonFiles.size).toBe(0);
  });

  it("rejects a card linked to a lesson outside its deck", () => {
    const deck = createDeck();
    const card = deck.cards[0];
    if (!card) {
      throw new Error("Fixture has no card");
    }
    card.lessonId = deckId;

    expect(() => parseDeck(deck)).toThrow("references a lesson outside this deck");
  });

  it("rejects too many cards before reading assets", () => {
    const deck = createDeck();
    const card = deck.cards[0];
    if (!card) {
      throw new Error("Fixture has no card");
    }
    deck.cards = Array.from({ length: 1_001 }, () => ({ ...card }));

    expect(() => parseDeck(deck)).toThrow(DeckParseError);
  });

  it("rejects malformed JSON with a package error and original cause", () => {
    const archive = zipSync({ "deck.json": strToU8("{invalid") });

    try {
      parseDeckPackage(archive);
      expect.fail("Expected malformed JSON to fail");
    } catch (error) {
      if (!(error instanceof DeckPackageParseError)) {
        throw error;
      }
      expect(error.issues).toEqual([{ path: ["deck.json"], message: "Malformed JSON" }]);
      expect(error.cause).toBeInstanceOf(SyntaxError);
    }
  });

  it.each(["../deck.json", "lessons/../deck.json", "audio\\card.mp3"])(
    "rejects unsafe or unexpected archive path %s",
    (path) => {
      expect(() =>
        parseDeckPackage(zipSync({ ...createPackageFiles(), [path]: strToU8("x") }))
      ).toThrow(DeckPackageParseError);
    }
  );

  it.each([
    ["missing audio", `audio/${cardId}.mp3`, undefined, "Missing or empty audio file"],
    ["empty audio", `audio/${cardId}.mp3`, new Uint8Array(), "Missing or empty audio file"],
    ["missing lesson", `lessons/${lessonId}.md`, undefined, "Missing or empty lesson file"],
    ["blank lesson", `lessons/${lessonId}.md`, strToU8(" \n"), "Empty lesson file"],
  ])("rejects %s", (_scenario, path, replacement, message) => {
    const files = createPackageFiles();
    if (replacement === undefined) {
      delete files[path];
    } else {
      files[path] = replacement;
    }

    expect(() => parseDeckPackage(zipSync(files))).toThrow(message);
  });

  it.each([
    ["audio", `audio/${cardId}.mp3`, 5 * 1024 * 1024 + 1],
    ["lesson", `lessons/${lessonId}.md`, 256 * 1024 + 1],
  ])("rejects an oversized %s before installing content", (_scenario, path, size) => {
    const archive = zipSync({ ...createPackageFiles(), [path]: new Uint8Array(size) });

    expect(() => parseDeckPackage(archive)).toThrow("exceeds size limit");
  });

  it("rejects a package without a manifest", () => {
    expect(() =>
      parseDeckPackage(zipSync({ [`audio/${cardId}.mp3`]: new Uint8Array([1]) }))
    ).toThrow("Missing or empty deck.json");
  });

  it("reports corrupt ZIP input as a package error", () => {
    expect(() => parseDeckPackage(new Uint8Array([1, 2, 3]))).toThrow(DeckPackageParseError);
  });

  it("rejects a ZIP with a corrupt central-directory entry", () => {
    const archive = zipSync(createPackageFiles());
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    const end = findZipEndRecord(archive);
    view.setUint32(view.getUint32(end + 16, true), 0, true);

    expect(() => parseDeckPackage(archive)).toThrow(DeckPackageParseError);
  });

  it("rejects ZIP64 metadata", () => {
    const archive = zipSync(createPackageFiles());
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    const end = findZipEndRecord(archive);
    view.setUint16(end + 8, 0xffff, true);
    view.setUint16(end + 10, 0xffff, true);

    expect(() => parseDeckPackage(archive)).toThrow("ZIP64 archives are not supported");
  });
});
