import { beforeEach, describe, expect, it, vi } from "vitest";

const existingFiles = new Set<string>();
const existingDirectories = new Set<string>();

vi.mock("expo-file-system", () => ({
  Directory: class {
    readonly uri: string;

    constructor(...parts: Array<string | { uri?: string }>) {
      this.uri = parts.map((part) => (typeof part === "string" ? part : part.uri)).join("/");
    }

    get exists() {
      return existingDirectories.has(this.uri);
    }

    get name() {
      return this.uri.split("/").at(-1) ?? "";
    }

    create() {
      existingDirectories.add(this.uri);
    }

    delete() {
      for (const directory of existingDirectories) {
        if (directory === this.uri || directory.startsWith(`${this.uri}/`)) {
          existingDirectories.delete(directory);
        }
      }
      for (const file of existingFiles) {
        if (file.startsWith(`${this.uri}/`)) {
          existingFiles.delete(file);
        }
      }
    }

    list() {
      return [];
    }

    async move(destination: { uri: string }) {
      existingDirectories.delete(this.uri);
      existingDirectories.add(destination.uri);
      for (const file of existingFiles) {
        if (file.startsWith(`${this.uri}/`)) {
          existingFiles.delete(file);
          existingFiles.add(`${destination.uri}${file.slice(this.uri.length)}`);
        }
      }
    }
  },
  File: class {
    readonly uri: string;
    readonly exists: boolean;

    constructor(...parts: Array<string | { uri?: string }>) {
      this.uri = parts.map((part) => (typeof part === "string" ? part : part.uri)).join("/");
      this.exists = existingFiles.has(this.uri);
    }

    write() {
      existingFiles.add(this.uri);
    }
  },
  Paths: { document: "document" },
}));

import { AnswerAudioServiceImpl } from "@/features/audio/application/answer-audio.service.impl";
import { InstalledAudioStorage } from "@/features/decks/deck-installer/internal/installed-audio-storage";

describe("installed audio lookup", () => {
  beforeEach(() => {
    existingFiles.clear();
    existingDirectories.clear();
  });

  it("uses the exact deck, version, card, and side path", () => {
    existingFiles.add("document/deck-audio/deck-a/2/card.answer.mp3");
    existingFiles.add("document/deck-audio/deck-b/1/card.question.mp3");
    existingFiles.add("document/deck-audio/deck-b/2/misleading-card.answer.mp3");
    const storage = new InstalledAudioStorage();

    expect(storage.findSourceForFlashcard("deck-a", 2, "card", "answer")).toEqual({
      uri: "document/deck-audio/deck-a/2/card.answer.mp3",
    });
    expect(storage.findSourceForFlashcard("deck-a", 1, "card", "answer")).toBeNull();
    expect(storage.findSourceForFlashcard("deck-b", 1, "card", "answer")).toBeNull();
    expect(storage.findSourceForFlashcard("deck-b", 1, "card", "question")).toEqual({
      uri: "document/deck-audio/deck-b/1/card.question.mp3",
    });
  });

  it("passes every required lookup coordinate through the application service", () => {
    const repository = { findSourceForFlashcard: vi.fn(() => ({ uri: "installed.mp3" })) };
    const service = new AnswerAudioServiceImpl(repository);

    expect(service.findSourceForFlashcard("deck", 7, "card", "question")).toEqual({
      uri: "installed.mp3",
    });
    expect(repository.findSourceForFlashcard).toHaveBeenCalledWith("deck", 7, "card", "question");
  });

  it("replaces orphaned same-version audio during activation", async () => {
    const storage = new InstalledAudioStorage();
    const deckPackage = {
      audioFiles: new Map([["audio/card.answer.mp3", new Uint8Array([1, 2, 3])]]),
      cards: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      description: "",
      id: "deck-a",
      title: "Deck",
      updatedAt: "2026-01-01T00:00:00.000Z",
      version: 2,
    };
    existingDirectories.add("document/deck-audio/deck-a/2");
    existingFiles.add("document/deck-audio/deck-a/2/stale.answer.mp3");

    const staged = await storage.stage(deckPackage);
    await storage.activate(staged);

    expect(existingFiles).not.toContain("document/deck-audio/deck-a/2/stale.answer.mp3");
    expect(storage.findSourceForFlashcard("deck-a", 2, "card", "answer")).toEqual({
      uri: "document/deck-audio/deck-a/2/card.answer.mp3",
    });
  });
});
