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

import { FlashcardAudioServiceImpl } from "@/features/audio/application/flashcard-audio.service.impl";
import { InstalledAudioStorage } from "@/features/decks/deck-installer/internal/installed-audio-storage";

describe("installed audio lookup", () => {
  beforeEach(() => {
    existingFiles.clear();
    existingDirectories.clear();
  });

  it("uses the exact deck, revision, and card path", () => {
    existingFiles.add("document/deck-audio/deck-a/2/card.mp3");
    existingFiles.add("document/deck-audio/deck-b/1/card.mp3");
    existingFiles.add("document/deck-audio/deck-b/2/misleading-card.mp3");
    const storage = new InstalledAudioStorage();

    expect(storage.findSourceForFlashcard("deck-a", 2, "card")).toEqual({
      uri: "document/deck-audio/deck-a/2/card.mp3",
    });
    expect(storage.findSourceForFlashcard("deck-a", 1, "card")).toBeNull();
    expect(storage.findSourceForFlashcard("deck-b", 1, "card")).toEqual({
      uri: "document/deck-audio/deck-b/1/card.mp3",
    });
  });

  it("passes deck, revision, and card through the application service", () => {
    const repository = { findSourceForFlashcard: vi.fn(() => ({ uri: "installed.mp3" })) };
    const service = new FlashcardAudioServiceImpl(repository);

    expect(service.findSourceForFlashcard("deck", 7, "card")).toEqual({
      uri: "installed.mp3",
    });
    expect(repository.findSourceForFlashcard).toHaveBeenCalledWith("deck", 7, "card");
  });

  it("replaces orphaned same-version audio during activation", async () => {
    const storage = new InstalledAudioStorage();
    const deckPackage = {
      audioFiles: new Map([["card", new Uint8Array([1, 2, 3])]]),
      lessonFiles: new Map<string, string>(),
      deck: {
        schema: 1 as const,
        authorId: "bf0b5aa7-18d6-4b36-aae9-5aa93f93235e",
        cards: [],
        lessons: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        description: "",
        id: "deck-a",
        title: "Deck",
        updatedAt: "2026-01-01T00:00:00.000Z",
        revision: 2,
      },
    };
    existingDirectories.add("document/deck-audio/deck-a/2");
    existingFiles.add("document/deck-audio/deck-a/2/stale.mp3");

    const staged = await storage.stage(deckPackage);
    await storage.activate(staged);

    expect(existingFiles).not.toContain("document/deck-audio/deck-a/2/stale.mp3");
    expect(storage.findSourceForFlashcard("deck-a", 2, "card")).toEqual({
      uri: "document/deck-audio/deck-a/2/card.mp3",
    });
  });
});
