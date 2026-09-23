// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const services = vi.hoisted(() => ({
  download: vi.fn(),
  install: vi.fn(),
  remove: vi.fn(),
  pick: vi.fn(),
  invalidate: vi.fn(),
  report: vi.fn(),
}));
vi.mock("@/features/decks/presentation/dependencies/use-decks", () => ({
  useDecks: () => ({
    deckInstaller: { installFromFile: services.install },
    deckPackageDownloader: { download: services.download, remove: services.remove },
    deckPackagePicker: { pick: services.pick },
  }),
}));
vi.mock("@/features/decks/presentation/context/deck-content-context", () => ({
  useInvalidateDeckContent: () => services.invalidate,
}));
vi.mock("@/shared/errors/report-error", () => ({ reportError: services.report }));

import { useImportDeckPackage } from "@/features/decks/presentation/controllers/use-import-deck-package";

const downloadedFile = { uri: "file:///cache/deck.fcrdeck" };
const installedDeck = { deckId: "deck", status: "installed", version: 1 };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

describe("deck import lifetime", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    services.download.mockResolvedValue(downloadedFile);
    services.install.mockResolvedValue(installedDeck);
  });

  afterEach(() => {
    cleanup();
  });

  it("installs a download, refreshes deck content, and removes the temporary file", async () => {
    const hook = renderHook(useImportDeckPackage);
    let imported;
    await act(async () => {
      imported = await hook.result.current.importFromUrl("https://example.com/deck");
    });

    expect(imported).toMatchObject({ status: "installed" });
    expect(services.invalidate).toHaveBeenCalledOnce();
    expect(services.remove).toHaveBeenCalledOnce();
    expect(hook.result.current).toMatchObject({
      error: null,
      importing: false,
      downloading: false,
    });
  });

  it("treats cancellation as a normal result and cleans a late download", async () => {
    const download = deferred<typeof downloadedFile>();
    services.download.mockReturnValue(download.promise);
    const hook = renderHook(useImportDeckPackage);
    let pending!: ReturnType<typeof hook.result.current.importFromUrl>;
    act(() => {
      pending = hook.result.current.importFromUrl("https://example.com/deck");
      hook.result.current.cancelDownload();
    });
    await act(async () => {
      download.resolve(downloadedFile);
      expect(await pending).toBeNull();
    });

    expect(services.install).not.toHaveBeenCalled();
    expect(services.report).not.toHaveBeenCalled();
    expect(services.remove).toHaveBeenCalledOnce();
    expect(hook.result.current.error).toBeNull();
  });

  it("prevents a second import while the first is pending", async () => {
    const download = deferred<typeof downloadedFile>();
    services.download.mockReturnValue(download.promise);
    const hook = renderHook(useImportDeckPackage);
    let first!: ReturnType<typeof hook.result.current.importFromUrl>;
    act(() => {
      first = hook.result.current.importFromUrl("https://example.com/deck");
    });
    await expect(
      hook.result.current.importFromUrl("https://example.com/other")
    ).resolves.toBeNull();
    expect(services.download).toHaveBeenCalledOnce();
    await act(async () => {
      download.resolve(downloadedFile);
      await first;
    });
  });

  it("aborts an owned download when the screen unmounts", async () => {
    services.download.mockImplementation(
      (_url: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );
    const hook = renderHook(useImportDeckPackage);
    let pending!: ReturnType<typeof hook.result.current.importFromUrl>;
    act(() => {
      pending = hook.result.current.importFromUrl("https://example.com/deck");
    });
    hook.unmount();

    await expect(pending).resolves.toBeNull();
    expect(services.install).not.toHaveBeenCalled();
  });

  it("shows failed-import feedback until the learner clears it", async () => {
    services.download.mockRejectedValue(new Error("offline"));
    const hook = renderHook(useImportDeckPackage);
    await act(async () => {
      await hook.result.current.importFromUrl("https://example.com/deck");
    });
    expect(hook.result.current.error).toMatchObject({ code: "DECK_OPERATION_FAILED" });

    act(() => hook.result.current.clearImportError());
    expect(hook.result.current.error).toBeNull();
  });

  it("does not cancel installation after the download has completed", async () => {
    const installation = deferred<typeof installedDeck>();
    services.install.mockReturnValue(installation.promise);
    const hook = renderHook(useImportDeckPackage);
    let pending!: ReturnType<typeof hook.result.current.importFromUrl>;
    act(() => {
      pending = hook.result.current.importFromUrl("https://example.com/deck");
    });
    await waitFor(() => expect(hook.result.current.downloading).toBe(false));
    expect(hook.result.current.importing).toBe(true);
    act(() => hook.result.current.cancelDownload());
    await act(async () => {
      installation.resolve(installedDeck);
      expect(await pending).toMatchObject({ status: "installed" });
    });
  });

  it("ignores a file-picker result delivered after the screen unmounts", async () => {
    const picker = deferred<{ uri: string }>();
    services.pick.mockReturnValue(picker.promise);
    const hook = renderHook(useImportDeckPackage);
    const pending = hook.result.current.importFromDevice();
    hook.unmount();
    picker.resolve({ uri: "file:///documents/deck.fcrdeck" });

    await expect(pending).resolves.toBeNull();
    expect(services.install).not.toHaveBeenCalled();
  });

  it("finishes an in-flight installation after unmount without publishing stale success", async () => {
    const installation = deferred<typeof installedDeck>();
    services.install.mockReturnValue(installation.promise);
    const hook = renderHook(useImportDeckPackage);
    const pending = hook.result.current.importFromUrl("https://example.com/deck");
    await waitFor(() => expect(services.install).toHaveBeenCalledOnce());
    hook.unmount();
    installation.resolve(installedDeck);

    await expect(pending).resolves.toBeNull();
    expect(services.invalidate).toHaveBeenCalledOnce();
    expect(services.remove).toHaveBeenCalledOnce();
  });
});
