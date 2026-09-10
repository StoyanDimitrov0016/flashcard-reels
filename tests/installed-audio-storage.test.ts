import { beforeEach, describe, expect, it, vi } from "vitest";

const existingFiles = new Set<string>();

vi.mock("expo-file-system", () => ({
  Directory: class {
    readonly uri: string;

    constructor(...parts: Array<string | { uri?: string }>) {
      this.uri = parts.map((part) => (typeof part === "string" ? part : part.uri)).join("/");
    }
  },
  File: class {
    readonly uri: string;
    readonly exists: boolean;

    constructor(...parts: Array<string | { uri?: string }>) {
      this.uri = parts.map((part) => (typeof part === "string" ? part : part.uri)).join("/");
      this.exists = existingFiles.has(this.uri);
    }
  },
  Paths: { document: "document" },
}));

import { AnswerAudioServiceImpl } from "@/features/audio/application/answer-audio.service.impl";
import { InstalledAudioStorage } from "@/features/audio/infrastructure/installed-audio-storage";

describe("installed audio lookup", () => {
  beforeEach(() => existingFiles.clear());

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
});
