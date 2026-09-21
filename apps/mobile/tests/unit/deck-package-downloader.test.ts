import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  download: vi.fn(),
  remove: vi.fn(),
  release: vi.fn(),
  log: vi.fn(),
  exists: true,
}));
vi.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  File: class {
    uri = "file:///cache/import.fcrdeck";
    get exists() {
      return native.exists;
    }
    delete() {
      native.remove();
    }
  },
  DownloadTask: class {
    private options: { signal: AbortSignal };
    constructor(_url: string, _file: unknown, options: { signal: AbortSignal }) {
      this.options = options;
    }
    downloadAsync() {
      return native.download(this.options.signal);
    }
    release() {
      native.release();
    }
  },
}));
vi.mock("@/shared/errors/report-error", () => ({ reportError: native.log }));

import {
  DECK_DOWNLOAD_TIMEOUT_MS,
  ExpoDeckPackageDownloader,
} from "@/features/decks/infrastructure/expo-deck-package.downloader";

describe("deck package download ownership", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    native.exists = true;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a completed download and releases the task without deleting its file", async () => {
    native.download.mockResolvedValue({ uri: "file:///cache/deck.fcrdeck" });
    await expect(
      new ExpoDeckPackageDownloader().download("https://example.com/deck")
    ).resolves.toEqual({ uri: "file:///cache/deck.fcrdeck" });
    expect(native.remove).not.toHaveBeenCalled();
    expect(native.release).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("categorizes network failure and deletes an interrupted file", async () => {
    const cause = new Error("offline");
    native.download.mockRejectedValue(cause);
    await expect(
      new ExpoDeckPackageDownloader().download("https://example.com/deck")
    ).rejects.toMatchObject({ code: "DECK_DOWNLOAD_FAILED", cause });
    expect(native.remove).toHaveBeenCalledOnce();
    expect(native.release).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aborts stalled downloads and exposes a timeout category", async () => {
    native.download.mockImplementation(
      (signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );
    const failure = new ExpoDeckPackageDownloader()
      .download("https://example.com/deck")
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(DECK_DOWNLOAD_TIMEOUT_MS);
    await expect(failure).resolves.toMatchObject({ code: "DECK_DOWNLOAD_TIMED_OUT" });
    expect(native.remove).toHaveBeenCalledOnce();
    expect(native.release).toHaveBeenCalledOnce();
  });

  it("preserves user cancellation rather than classifying it as a download failure", async () => {
    const cause = new Error("cancelled");
    native.download.mockImplementation(
      (signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(cause));
        })
    );
    const controller = new AbortController();
    const failure = new ExpoDeckPackageDownloader()
      .download("https://example.com/deck", controller.signal)
      .catch((error: unknown) => error);
    controller.abort();
    await expect(failure).resolves.toBe(cause);
    expect(native.remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not hide a download failure when partial-file cleanup fails", async () => {
    native.download.mockRejectedValue(new Error("offline"));
    native.remove.mockImplementation(() => {
      throw new Error("cleanup failed");
    });
    await expect(
      new ExpoDeckPackageDownloader().download("https://example.com/deck")
    ).rejects.toMatchObject({ code: "DECK_DOWNLOAD_FAILED" });
    expect(native.log).toHaveBeenCalledOnce();
  });

  it("does not turn a completed download into failure when releasing the task fails", async () => {
    native.download.mockResolvedValue({ uri: "file:///cache/deck.fcrdeck" });
    native.release.mockImplementation(() => {
      throw new Error("release failed");
    });
    await expect(
      new ExpoDeckPackageDownloader().download("https://example.com/deck")
    ).resolves.toMatchObject({ uri: "file:///cache/deck.fcrdeck" });
    expect(native.log).toHaveBeenCalledOnce();
  });
});
