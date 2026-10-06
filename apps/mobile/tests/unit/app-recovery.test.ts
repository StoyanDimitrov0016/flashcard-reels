import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  files: new Set<string>(),
  deleted: [] as string[],
  failOn: "",
  platform: "android",
}));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return state.platform;
    },
  },
}));
// Native modules report a filesystem path, not a URI. Expo Go app folders contain `%`.
vi.mock("expo-sqlite", () => ({
  defaultDatabaseDirectory: "/data/user/0/host/files/ExperienceData/%40me%2Fapp/SQLite",
}));
const DATABASE_URI = "file:///data/user/0/host/files/ExperienceData/%2540me%252Fapp/SQLite";
vi.mock("expo-file-system", () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      if (typeof parts[0] === "string" && parts[0].startsWith("/")) {
        throw new Error("URI is not absolute");
      }
      this.uri = parts.map((part) => (typeof part === "string" ? part : part.uri)).join("/");
    }
    get name() {
      return this.uri.split("/").at(-1) ?? "";
    }
    get exists() {
      return state.files.has(this.uri);
    }
    write() {
      state.files.add(this.uri);
    }
    delete() {
      if (state.failOn === this.uri) {
        throw new Error("Storage unavailable");
      }
      state.deleted.push(this.uri);
      state.files.delete(this.uri);
    }
  }
  class Directory extends File {
    list() {
      return [...state.files]
        .filter((path) => path.startsWith(this.uri + "/"))
        .map((path) =>
          path.startsWith("documents/deck-audio/.tmp-") ? new Directory(path) : new File(path)
        );
    }
  }
  return {
    File,
    Directory,
    Paths: { document: new Directory("documents"), cache: new Directory("cache") },
  };
});

import {
  applyPendingAppDataReset,
  prepareAppStorage,
  requestAppDataReset,
} from "@/infrastructure/app-recovery";
import { RecoveryError } from "@/infrastructure/errors/recovery-error";

const marker = "documents/flashcard-reels-reset-pending";

beforeEach(() => {
  state.files.clear();
  state.deleted.length = 0;
  state.failOn = "";
  state.platform = "android";
});

describe("full app recovery", () => {
  it("removes interrupted imports on cold startup without removing installed data", async () => {
    vi.resetModules();
    const storage = await import("@/infrastructure/app-recovery");
    const staged = "documents/deck-audio/.tmp-interrupted";
    const downloaded = "cache/deck-import-123.fcrdeck";
    for (const path of [
      "documents/deck-audio",
      staged,
      "documents/deck-audio/installed",
      "cache",
      downloaded,
      "cache/other.file",
      DATABASE_URI + "/flashcard-reels.db",
    ]) {
      state.files.add(path);
    }
    storage.prepareAppStorage();
    expect(state.deleted).toEqual([staged, downloaded]);
    expect(state.files.has("documents/deck-audio/installed")).toBe(true);
    expect(state.files.has(DATABASE_URI + "/flashcard-reels.db")).toBe(true);
    expect(state.files.has("cache/other.file")).toBe(true);
    storage.prepareAppStorage();
    expect(state.deleted).toEqual([staged, downloaded]);
  });
  it("defers new reset requests across root retries until a cold launch", () => {
    prepareAppStorage();
    requestAppDataReset();
    state.files.add(DATABASE_URI + "/flashcard-reels.db");
    prepareAppStorage();
    expect(state.deleted).toEqual([]);
    expect(state.files.has(marker)).toBe(true);
  });
  it("only records a reset request while the app is running", () => {
    requestAppDataReset();
    expect(state.files.has(marker)).toBe(true);
    expect(state.deleted).toEqual([]);
  });

  it("does not delete anything without an explicit request", () => {
    state.files.add(DATABASE_URI + "/flashcard-reels.db");
    applyPendingAppDataReset();
    expect(state.deleted).toEqual([]);
  });

  it("deletes owned data and sidecars, preserving unrelated files", () => {
    for (const path of [
      marker,
      DATABASE_URI + "/flashcard-reels.db",
      DATABASE_URI + "/flashcard-reels.db-wal",
      DATABASE_URI + "/flashcard-reels-v2.db",
      DATABASE_URI + "/flashcard-reels-v2.db-wal",
      DATABASE_URI + "/flashcard-reels-v3.db",
      DATABASE_URI + "/flashcard-reels-v3.db-wal",
      DATABASE_URI + "/flashcard-reels-v4.db",
      DATABASE_URI + "/flashcard-reels-v4.db-wal",
      DATABASE_URI + "/flashcard-reels-v5.db",
      DATABASE_URI + "/flashcard-reels-v5.db-wal",
      DATABASE_URI + "/flashcard-reels-v7.db",
      DATABASE_URI + "/flashcard-reels-v7.db-wal",
      DATABASE_URI + "/flashcard-reels-v8.db",
      DATABASE_URI + "/flashcard-reels-v8.db-wal",
      "documents/deck-audio",
      "cache",
      "cache/deck-import-123.fcrdeck",
      "cache/other.file",
      "documents/unrelated.txt",
    ]) {
      state.files.add(path);
    }
    applyPendingAppDataReset();
    expect(state.deleted).toEqual([
      DATABASE_URI + "/flashcard-reels.db",
      DATABASE_URI + "/flashcard-reels.db-wal",
      DATABASE_URI + "/flashcard-reels-v2.db",
      DATABASE_URI + "/flashcard-reels-v2.db-wal",
      DATABASE_URI + "/flashcard-reels-v3.db",
      DATABASE_URI + "/flashcard-reels-v3.db-wal",
      DATABASE_URI + "/flashcard-reels-v4.db",
      DATABASE_URI + "/flashcard-reels-v4.db-wal",
      DATABASE_URI + "/flashcard-reels-v5.db",
      DATABASE_URI + "/flashcard-reels-v5.db-wal",
      DATABASE_URI + "/flashcard-reels-v7.db",
      DATABASE_URI + "/flashcard-reels-v7.db-wal",
      DATABASE_URI + "/flashcard-reels-v8.db",
      DATABASE_URI + "/flashcard-reels-v8.db-wal",
      "documents/deck-audio",
      "cache/deck-import-123.fcrdeck",
      marker,
    ]);
    expect(state.files.has("cache/other.file")).toBe(true);
    expect(state.files.has("documents/unrelated.txt")).toBe(true);
  });

  it("keeps the request after a partial failure and safely retries", () => {
    requestAppDataReset();
    state.files.add(DATABASE_URI + "/flashcard-reels.db");
    state.files.add("documents/deck-audio");
    state.failOn = "documents/deck-audio";
    let caught: unknown;
    try {
      applyPendingAppDataReset();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RecoveryError);
    expect(caught).toHaveProperty("cause.message", "Storage unavailable");
    expect(state.files.has(marker)).toBe(true);
    state.failOn = "";
    applyPendingAppDataReset();
    expect(state.files.has(marker)).toBe(false);
  });

  it("does not touch native filesystem paths on web", () => {
    state.platform = "web";
    applyPendingAppDataReset();
    expect(state.deleted).toEqual([]);
    expect(requestAppDataReset).toThrow(RecoveryError);
  });
});
