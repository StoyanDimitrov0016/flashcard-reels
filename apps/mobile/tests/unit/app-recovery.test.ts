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
vi.mock("expo-sqlite", () => ({ defaultDatabaseDirectory: "documents/SQLite" }));
vi.mock("expo-file-system", () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
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
        .map((path) => new File(path));
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
  it("defers new reset requests across root retries until a cold launch", () => {
    prepareAppStorage();
    requestAppDataReset();
    state.files.add("documents/SQLite/flashcard-reels.db");
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
    state.files.add("documents/SQLite/flashcard-reels.db");
    applyPendingAppDataReset();
    expect(state.deleted).toEqual([]);
  });

  it("deletes owned data and sidecars, preserving unrelated files", () => {
    for (const path of [
      marker,
      "documents/SQLite/flashcard-reels.db",
      "documents/SQLite/flashcard-reels.db-wal",
      "documents/SQLite/ExpoSQLiteStorage",
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
      "documents/SQLite/flashcard-reels.db",
      "documents/SQLite/flashcard-reels.db-wal",
      "documents/SQLite/ExpoSQLiteStorage",
      "documents/deck-audio",
      "cache/deck-import-123.fcrdeck",
      marker,
    ]);
    expect(state.files.has("cache/other.file")).toBe(true);
    expect(state.files.has("documents/unrelated.txt")).toBe(true);
  });

  it("keeps the request after a partial failure and safely retries", () => {
    requestAppDataReset();
    state.files.add("documents/SQLite/flashcard-reels.db");
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
